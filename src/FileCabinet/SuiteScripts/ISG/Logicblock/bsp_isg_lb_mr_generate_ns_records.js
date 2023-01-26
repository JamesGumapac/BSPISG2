/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', '../Lib/bsp_isg_lb_utils.js', '../Lib/bsp_isg_lb_entities.js', '../Lib/bsp_isg_lb_items.js', '../Lib/bsp_isg_lb_transactions.js', '../Lib/bsp_isg_lb_login_api.js', '../Lib/bsp_isg_lb_settings.js', '../Lib/bsp_isg_lb_ordersservice_api.js'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search, BSPLBUtils, BSPLBEntities, BSPLBItems, BSPLBTransactions, BSPLBLoginAPI, BSPLBSettings, LBOrdersAPI) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            let functionName = "getInputData";
            let lbTransactionsData = [];
            try{
                log.debug(functionName, "************ EXECUTION STARTED ************");
                let objScriptParams = getParameters();
                let settings = BSPLBUtils.getIntegrationSettings(objScriptParams.integrationSettingsRecID);
                let lbTransactions = [];
                let inboundQueues = BSPLBUtils.getInboundQueues();
                inboundQueues.run().each(function (result) {
                    let queueRecID = result.id;

                    let queueId = result.getValue({
                        name: "custrecord_bsp_lb_queue_id",
                    });
                    let jsonResponse = result.getValue({
                        name: "custrecord_bsp_lb_json_resp",
                    });

                    let data = {queueRecID : queueRecID, queueId: queueId, jsonResponse: JSON.parse(jsonResponse)};

                    lbTransactions.push(data);                      
                    return true;
                });

                let recordType = BSPLBUtils.recTypes().salesOrder;
                let salesOrderObjMappingFields = BSPLBUtils.getMappingFields(recordType, true);

                recordType = BSPLBUtils.recTypes().cashSale;
                let cashSaleObjMappingFields = BSPLBUtils.getMappingFields(recordType, false);

                recordType = BSPLBUtils.recTypes().customer;
                let customerObjMappingFields = BSPLBUtils.getMappingFields(recordType, true);

                recordType = BSPLBUtils.recTypes().item;
                let itemObjMappingFields = BSPLBUtils.getMappingFields(recordType, false);

                let loginData = BSPLBLoginAPI.login(settings);

                lbTransactions.forEach(element => {
                    lbTransactionsData.push({
                        key: element.queueId,
                        value: {
                            lbTransaction: element,
                            salesOrderObjMappingFields: salesOrderObjMappingFields,
                            cashSaleObjMappingFields: cashSaleObjMappingFields,
                            customerObjMappingFields: customerObjMappingFields,
                            itemObjMappingFields: itemObjMappingFields,
                            settings: settings,
                            loginData: loginData
                        }
                    });
                });

                log.debug(functionName, 
                    {
                        lbTransactionsData: lbTransactionsData.length
                    }
                );

            }catch (error){
                log.error(functionName, {error: error.message});
                let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    error
                );
            }
            return lbTransactionsData;
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            let functionName = "reduce";
            let logicBlockTransactionData = JSON.parse(reduceContext.values);
            let customerRecordResult = null;
            let itemRecordsResult = null;
            let salesOrderRecordsResult = null;
            let cashSaleRecordsResult = null;
            log.debug(functionName, "*** REDUCE STARTED ***");
            try{               
                let updateRetryCount = false;
                let settings = logicBlockTransactionData.value.settings;
                let loginData = logicBlockTransactionData.value.loginData;
                let inboundQueueRecID = logicBlockTransactionData.value.lbTransaction.queueRecID;
                let logicBlockOrder = logicBlockTransactionData.value.lbTransaction.jsonResponse;

                /*************************
                 * 
                 * Create Customer Record
                 * 
                 *************************/

                let logicBlockUserAccount = logicBlockOrder.UserAccount;
                let customerObjMappingFields = logicBlockTransactionData.value.customerObjMappingFields;
                customerRecordResult = BSPLBEntities.fetchCustomer(logicBlockUserAccount, customerObjMappingFields);

                log.debug(functionName, {customerRecordResult});

                if(!BSPLBUtils.isEmpty(customerRecordResult)){

                    /*************************
                     * 
                     * Create Item Records
                     * 
                     *************************/

                    let itemObjMappingFields = logicBlockTransactionData.value.itemObjMappingFields;
                    itemRecordsResult = BSPLBItems.fetchItems(logicBlockOrder.LineItems.LineItem, itemObjMappingFields, settings, loginData);
                
                    log.debug(functionName, {itemRecordsResult});

                    if(!BSPLBUtils.isEmpty(itemRecordsResult)){

                        let isOrderPaid = BSPLBTransactions.orderPaid(logicBlockOrder);

                        if(isOrderPaid){

                            /***************************
                            * 
                            * Create Cash Sale Record
                            * 
                            ***************************/

                            let cashSaleObjMappingFields = logicBlockTransactionData.value.cashSaleObjMappingFields;
                            cashSaleRecordsResult = BSPLBTransactions.fetchTransaction(
                                logicBlockOrder, 
                                cashSaleObjMappingFields, 
                                customerRecordResult, 
                                itemRecordsResult, 
                                settings,
                                loginData,
                                record.Type.CASH_SALE
                            );
                            log.debug(functionName, {cashSaleRecordsResult});
                             
                            if(BSPLBUtils.isEmpty(cashSaleRecordsResult)){
                                updateRetryCount = true;
                            }
                        }else{

                            /***************************
                            * 
                            * Create Sales Order Record
                            * 
                            ***************************/
                        
                            let salesOrderObjMappingFields = logicBlockTransactionData.value.salesOrderObjMappingFields;
                            salesOrderRecordsResult = BSPLBTransactions.fetchTransaction(
                                logicBlockOrder, 
                                salesOrderObjMappingFields, 
                                customerRecordResult, 
                                itemRecordsResult, 
                                settings,
                                loginData,
                                record.Type.SALES_ORDER
                            );
                            log.debug(functionName, {salesOrderRecordsResult});
                            
                            if(BSPLBUtils.isEmpty(salesOrderRecordsResult)){
                                updateRetryCount = true;
                            }else{
                                let result = LBOrdersAPI.updateBackendOrderId(settings, loginData, salesOrderRecordsResult);
                                if(result && result == "false"){
                                    updateRetryCount = true;
                                }
                            }
                        }               
                    }else{
                        updateRetryCount = true;
                    }
                }else{
                    updateRetryCount = true;
                }

                if(updateRetryCount){
                    BSPLBUtils.updateInboundQueueRetryCount(inboundQueueRecID);
                }else{
                    BSPLBUtils.markQueueAsProcessed(inboundQueueRecID, "customrecord_bsp_isg_lb_inbound_queue");
                }

            } catch (error) {
                log.error(functionName, {error: error.message});
                let errorDetail = {error:error, queueIdRec: logicBlockTransactionData.value.lbTransaction.queueRecID, queueId: logicBlockTransactionData.value.lbTransaction.queueId}
                let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    errorDetail
                );
            }
        }

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            let functionName = 'Summarize';
            try{
                let objScriptParams = getParameters();
                let deletedQueues = BSPLBUtils.deleteProcessedInboundQueues(objScriptParams.integrationSettingsRecID);
                log.audit(functionName, {'deletedProcessedQueues': deletedQueues});

            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
                let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    error
                );
            }
            log.audit(functionName, {'UsageConsumed' : summaryContext.usage, 'NumberOfQueues' : summaryContext.concurrency, 'NumberOfYields' : summaryContext.yields});
            log.debug(functionName, "************ EXECUTION COMPLETED ************");
        }

        /**
         * Retieves Script parameters set up in the Deployment Record
         * @returns {Object} Script parameters
        */
         const getParameters = () => {
            let objParams = {};
            let environment = runtime.envType;
            objParams = {
                integrationSettingsRecID : BSPLBSettings.getSettingsID(environment)
            }         
            return objParams;
        }

        return {getInputData, reduce, summarize}

    });
