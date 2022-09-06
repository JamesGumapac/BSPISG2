/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/task', './lib/bsp_transmitions_util.js', './lib/bsp_edi_settings.js', './lib/bsp_purchase_orders.js'],
    /**
    * @param{runtime} runtime
    * @param{search} search
    * @param{BSPTransmitionsUtil} BSPTransmitionsUtil
    */
    (runtime, search, task, BSPTransmitionsUtil, BSP_EDISettingsUtil, BSP_POutil) => {
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
                let account = transmitionRecFields.accountNumber;
                let transmissionLocation = transmitionRecFields.location;

                let ediSettings = BSP_EDISettingsUtil.getEDIsettings(paramsObj.environment);

                let transmitionSavedSearcObj = search.load({id: transmitionSavedSearchID});
                let resultSearch = BSPTransmitionsUtil.searchAll(transmitionSavedSearcObj);
                resultSearch.forEach(element => {
                    let salesOrderID = element.id;
                    let routeCodeID = element.getValue("custbody_bsp_isg_route_code");
                    let location = element.getValue({name: "custrecord_bsp_lb_location", join: "custbody_bsp_isg_route_code"});
                    let itemID = element.getValue("item");
                    let itemQuantity = element.getValue("quantity");
                    let itemQuantityCommited = element.getValue("quantitycommitted");
                    let resultQuantity = (itemQuantity - itemQuantityCommited);
                    let customer = element.getValue("entity");

                    transmitionData.push({
                        transactionForm: ediSettings.transactionForm,
                        transmitionRecID: transmitionRecID,
                        transmitionQueueID: transmitionQueueID,
                        salesOrderID: salesOrderID,
                        routeCode: {routeCodeID: routeCodeID, location: location},
                        itemID: itemID,
                        vendor: vendor,
                        itemQuantity: resultQuantity,
                        customer: customer,
                        autoreceive: autoreceive,
                        account: account,
                        transmissionLocation: transmissionLocation
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
                let transmitionQueueID = commonData.transmitionQueueID;
                let customer =  commonData.customer;
                let account = BSPTransmitionsUtil.getAccountNumber(customer, commonData.account);
                let vendor = commonData.vendor;
                let routeCode = commonData.routeCode;
                let autoreceive = commonData.autoreceive;
                let transmissionLocation = commonData.transmissionLocation;
                let transactionForm = commonData.transactionForm;
                let poData = {
                    transactionForm: transactionForm,
                    transmitionQueueID: transmitionQueueID, 
                    salesOrderID:salesOrderID, 
                    customer:customer, 
                    vendor:vendor, 
                    routeCode: routeCode,
                    autoreceive: autoreceive, 
                    account: account,
                    transmissionLocation: transmissionLocation,
                    itemData: itemData
                };
                log.debug(functionName, `Working with SO data: ${JSON.stringify(poData)}`);

                let purchaseOrder = BSP_POutil.createPurchaseOrders(poData);
                log.debug(functionName, `PO Created: ${purchaseOrder}`);

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
                        custscript_bsp_mr_transm_rec: transmitionRecID
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
/*  */
