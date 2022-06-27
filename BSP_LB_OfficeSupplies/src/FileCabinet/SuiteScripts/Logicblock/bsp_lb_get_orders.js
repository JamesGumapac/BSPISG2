/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', './lib/bsp_lb_utils.js', './lib/bsp_lb_ordersservice_api.js'],
    /**
     * @param{runtime} runtime
     */
    (runtime, BSPLBUtils, LBOrdersAPI) => {
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
            let lbOrders = [];
            try
            {
                log.debug(functionName, "************ EXECUTION STARTED ************");

                let objScriptParams = getParameters();

                let lbOrdersResult = LBOrdersAPI.getOrders(objScriptParams.integrationSettingsRecID);

                if(lbOrdersResult.lbOrders){
                    lbOrders = lbOrdersResult.lbOrders;
                }else{
                    let errorSource = "BSP | LB | MR | Get Orders - " + functionName;
                    BSPLBUtils.createErrorLog(
                        errorSource,
                        lbOrdersResult.errorMessage,
                        lbOrdersResult.error
                    );
                }
                
            } catch (error)
            {
                log.error(functionName, {error: error.toString()});
                let errorSource = "BSP | LB | MR | Get Orders - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    error
                );
            }
            return lbOrders;
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
            try{
                let objLogicblockOrder = reduceContext.values;
                let lbOrder = JSON.parse(objLogicblockOrder);
                log.debug(functionName,{lbOrder});

                let queueId = lbOrder.Id; 

                let validOrder = validOrderForNetSuite(lbOrder);
                if(validOrder){
                    let inboundQueueResult = BSPLBUtils.createInboundQueue(
                        queueId,
                        lbOrder
                    );
    
                    if (inboundQueueResult.status == BSPLBUtils.constants().successStatus){
                        log.debug(
                            functionName + " - Create Inbound Queue SUCCESS",
                            {inboundQueueRecId:inboundQueueResult.message, queueId:inboundQueueResult.queueId}
                        );
                    }else{
                        log.error(
                            functionName + " - Create Inbound Queue ERROR",
                            {errorMessage:inboundQueueResult.message}
                        );
                        let errorSource = "BSP | LB | MR | Get Orders  - " + functionName;
                        BSPLBUtils.createErrorLog(
                            errorSource,
                            inboundQueueResult.code,
                            BSPLBUtils.buildErrorDetails({error:inboundQueueResult.message, queueId:inboundQueueResult.queueId})
                        );
                    }
                }
            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
                let errorSource = "BSP | LB | MR | Get Orders - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    error
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
                /*let objScriptParams = getParameters();
                BSPLBUtils.updateLastRuntimeExecution(objScriptParams.integrationSettingsRecID);*/
                let scriptId = BSPLBUtils.constants().mrCreateRecordsScriptId;
                let deploymentId = BSPLBUtils.constants().mrCreateRecordsDeploymentId;
                BSPLBUtils.scheduleMRTask(scriptId,deploymentId);
            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
                let errorSource = "BSP | LB | MR | Get Orders - " + functionName;
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
            let objScript = runtime.getCurrentScript();
            objParams = {
                integrationSettingsRecID : objScript.getParameter({name: "custscript_bsp_lb_integration_settings"})
            }         
            return objParams;
        }

        /**
         * Check if Logicblock Order is valid for creation in NetSuite
         * @param {*} lbOrder 
         * @returns 
         */
        const validOrderForNetSuite = (lbOrder) =>{
            let hasUserID = (BSPLBUtils.isEmpty(lbOrder.UserId) ? false : true);

            let isPlaced = ((lbOrder.IsPlaced == "true") ? true : false);

            let objScriptParams = getParameters();
            let orderStatusesFilter = BSPLBUtils.getOrderStatusFilter(objScriptParams.integrationSettingsRecID);
            log.debug("validOrderForNetSuite", {
                orderStatusesFilter: orderStatusesFilter
            });
            let orderStatus = lbOrder.OrderStatusName;
            let statusValud = (orderStatusesFilter.indexOf(orderStatus) != -1);
            log.debug("validOrderForNetSuite", {
                hasUserID: hasUserID,
                orderStatus: orderStatus,
                statusValud: statusValud
            });
            return hasUserID && statusValud && isPlaced;
        }

        return {getInputData, reduce, summarize}

    });
