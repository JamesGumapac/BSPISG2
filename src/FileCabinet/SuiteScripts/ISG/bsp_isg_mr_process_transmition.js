/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/search', 'N/task', './Lib/bsp_isg_purchase_orders.js', './Lib/bsp_isg_edi_settings.js', './Lib/bsp_isg_transmitions_util.js', './Lib/bsp_isg_trading_partners.js'],
    /**
    * @param{runtime} runtime
    * @param{search} search
    * @param{BSPTransmitionsUtil} BSPTransmitionsUtil
    */
    (runtime, record, search, task, BSP_POutil, BSP_EDISettingsUtil, BSPTransmitionsUtil, BSPTradingParnters) => {
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
            let transmitionData = [];
            try
            {
                log.debug(functionName, "************ EXECUTION STARTED ************");

                let paramsObj = getParameters();
                let transmitionRecID = paramsObj.transmitionRecID;
                let transmitionQueueID = paramsObj.transmitionQueueID;

                log.debug(functionName, `Work with transmition ${transmitionRecID} of Queue: ${transmitionQueueID}`);

                BSPTransmitionsUtil.updateTransmissionQueueStatus(transmitionQueueID, BSPTransmitionsUtil.transmitionQueueStatus().transmitting);
                
                let transmitionRecFields = BSPTransmitionsUtil.getFieldsFromTransmitionRecord(transmitionRecID);
                let transmitionSavedSearchID = transmitionRecFields.savedSearch;  
                let vendor = transmitionRecFields.vendor;
                let autoreceive = transmitionRecFields.autoreceive;
                let adot = transmitionRecFields.adot;
                let account = transmitionRecFields.accountNumber;
                let transmissionLocation = transmitionRecFields.location;

                let ediSettings = BSP_EDISettingsUtil.getEDIsettings(paramsObj.environment);

                let paramTransmissionSavedSearchObj = search.load({id: transmitionSavedSearchID});
                let deliveryTime = BSPTradingParnters.getTradingPartnerDeliveryTime(vendor);
                let transmissionSearchObj = BSPTransmitionsUtil.buildTransmissionSavedSearch(paramTransmissionSavedSearchObj, vendor);
                let resultSearch = BSPTransmitionsUtil.searchAll(transmissionSearchObj);
                resultSearch.forEach(element => {
                    let salesOrderID = element.id;
                    let routeCodeID = element.getValue("custbody_bsp_isg_route_code");
                    let location = element.getValue({name: "location"});
                    let itemID = element.getValue("item");
                    let itemQuantity = element.getValue("quantity");
                    let itemQuantityCommited = element.getValue("quantitycommitted");
                    let resultQuantity = (itemQuantity - itemQuantityCommited);
                    let customer = element.getValue("entity");
                    let shipaddress1 = element.getValue("shipaddress1");
                    let shipmentType = element.getValue("custcol_bsp_order_shipment_type");
                    let shipaddress = element.getValue("shipaddress");
                    let shipcountry = element.getValue("shipcountrycode");
                    let shipcity = element.getValue("shipcity");
                    let shipzip = element.getValue("shipzip");
                    let shipaddressee = element.getValue("shipaddressee");
                    let shipphone = element.getValue("shipphone");
                    let shipstate = element.getValue("shipstate");

                    transmitionData.push({
                        transactionForm: ediSettings.transactionForm,
                        transmitionRecID: transmitionRecID,
                        transmitionQueueID: transmitionQueueID,
                        salesOrderID: salesOrderID,
                        location: location,
                        routeCodeID: routeCodeID,
                        shipmentType: shipmentType,
                        itemID: itemID,
                        vendor: vendor,
                        itemQuantity: resultQuantity,
                        customer: customer,
                        shipAddress: {
                            shipaddress1: shipaddress1,
                            shipaddress: shipaddress,
                            shipcountry: shipcountry,
                            shipcity: shipcity,
                            shipzip: shipzip,
                            shipaddressee: shipaddressee,
                            shipphone: shipphone,
                            shipstate: shipstate
                        },                  
                        autoreceive: autoreceive,
                        adot: adot,
                        account: account,
                        transmissionLocation: transmissionLocation,
                        deliveryTime: deliveryTime
                    });                                            
                }); 
            } catch (error)
            {
                log.error(functionName, {error: error.toString()});
            }
            return transmitionData;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */
         const map = (mapContext) => {
            let functionName = "map";
            try{
                let mapValue = JSON.parse(mapContext.value);
                let salesOrderID = mapValue.salesOrderID;
                mapContext.write({key: salesOrderID, value: mapValue});
            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
            }
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
                let salesOrderID = reduceContext.key;
                let itemData = reduceContext.values;
                let commonData = JSON.parse(reduceContext.values[0]);
                let deliveryTime = commonData.deliveryTime;

                let soField = search.lookupFields({
                    type: record.Type.SALES_ORDER,
                    id: parseInt(salesOrderID),
                    columns: 'shipdate'
                });
                log.debug(functionName, JSON.stringify(soField));
                let shipdate = null;
                if(soField && soField.shipdate){
                    shipdate = soField.shipdate;
                }

                if(!deliveryTime || 
                    (deliveryTime && BSPTransmitionsUtil.validShipDate(deliveryTime, shipdate))){

                    let transmitionQueueID = commonData.transmitionQueueID;
                    let customer =  commonData.customer;
                    let shipAddress = commonData.shipAddress;
                    let shipaddress1 = shipAddress.shipaddress1;
                    let vendor = commonData.vendor;
                    let account = BSPTransmitionsUtil.getAccountNumber(customer, vendor, shipaddress1, commonData.account);
                    let routeCode = commonData.routeCodeID;
                    let location = commonData.location;
                    let autoreceive = commonData.autoreceive;
                    let adot = commonData.adot;
                    let transmissionLocation = commonData.transmissionLocation;
                    let transactionForm = commonData.transactionForm;
                    let poData = {
                        transactionForm: transactionForm,
                        transmitionQueueID: transmitionQueueID, 
                        salesOrderID:salesOrderID, 
                        shipAddress: shipAddress,
                        customer:customer, 
                        vendor:vendor, 
                        routeCode: routeCode,
                        location: location,
                        autoreceive: autoreceive, 
                        account: account,
                        adot: adot,
                        transmissionLocation: transmissionLocation,
                        itemData: itemData
                    };
                    log.debug(functionName, `Working with SO data: ${JSON.stringify(poData)}`);

                    let purchaseOrders = BSP_POutil.createPurchaseOrders(poData);
                    log.debug(functionName, `POs Created: ${purchaseOrders}`);
                }

                

            }catch (error)
            {
                log.error(functionName, `Error Creating PO: ${error.toString()}`);
                let errorSource = "BSP | MR | Process Transmission - " + functionName;
                BSPTransmitionsUtil.createErrorLog(
                    errorSource,
                    error.message,
                    error.toString()
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
                let paramsObj = getParameters();
                let transmitionRecID = paramsObj.transmitionRecID;
                let transmitionQueueID = paramsObj.transmitionQueueID;
                let objMRTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: paramsObj.mr_script_id,
                    deploymentId: paramsObj.mr_script_dep_id,
                    params: {
                        custscript_bsp_mr_transm_queue: transmitionQueueID,
                        custscript_bsp_mr_transm_rec: transmitionRecID,
                        custscript_bsp_mr_po_rec_id: null
                    }
                });
                let intTaskID = objMRTask.submit();
                log.debug(functionName, `MR Task submitted with ID: ${intTaskID} for Transmition Queue: ${transmitionQueueID}`);
            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
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
            let objScript = runtime.getCurrentScript();
            objParams = {
                transmitionRecID : objScript.getParameter({name: "custscript_bsp_mr_transm_rec_id"}),
                transmitionQueueID : objScript.getParameter({name: "custscript_bsp_mr_transm_queue_id"}),
                mr_script_id : objScript.getParameter({name: "custscript_bsp_mr_transmit_po_script"}),
                mr_script_dep_id : objScript.getParameter({name: "custscript_bsp_mr_transmit_po_dep"}),
                environment: environment
            }
    
            return objParams;
        }

        return {getInputData, map, reduce, summarize}

    });
