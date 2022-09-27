/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search) => {
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
            let salesOrdersToProcess = [];
            try
            {
                log.debug(functionName, "************ EXECUTION STARTED ************");

                let paramsObj = getParameters();
                let poRecID = paramsObj.poRecID;

                const carton_buy_item_soSearchObj = search.create({
                    type: "customrecord_bsp_isg_carton_buy_item_so",
                    filters:
                    [
                       ["custrecord_bsp_isg_carton_buy_po","anyof",poRecID]
                    ],
                    columns:
                    [
                       search.createColumn({name: "custrecord_bsp_isg_carton_buy_so", label: "Sales Order"}),
                       search.createColumn({name: "custrecord_bsp_isg_item_line_unique_id", label: "Item line Unique ID"})
                    ]
                 });

                 carton_buy_item_soSearchObj.run().each(function(result){
                    let soID = result.getValue({name: "custrecord_bsp_isg_carton_buy_so"});
                    let itemLineUniqueID = result.getValue({name: "custrecord_bsp_isg_item_line_unique_id"});
                    salesOrdersToProcess.push({salesOrder: soID, lineItemID: itemLineUniqueID, poRecID: poRecID})
                    return true;
                 });

                 log.debug(functionName, JSON.stringify(salesOrdersToProcess));
            } catch (error)
            {
                log.error(functionName, {error: error.toString()});
            }
            return salesOrdersToProcess;
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
                let salesOrder = mapValue.salesOrder;
                mapContext.write({key: salesOrder, value: mapValue});
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

                let salesOrderRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: parseInt(salesOrderID),
                    isDynamic: true
                });

                for (let index = 0; index < itemData.length; index++) {
                    let element = itemData[index];
                    let itemObj = JSON.parse(element);

                    let lineNum = salesOrderRec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'lineuniquekey',
                        value: itemObj.lineItemID
                    });
                    salesOrderRec.selectLine({
                        sublistId: 'item',
                        line: lineNum
                    });
                    salesOrderRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_manual_po_id',
                        value: itemObj.poRecID
                    });
                    salesOrderRec.commitLine({
                        sublistId: "item",
                    });
                }    
                let soID = salesOrderRec.save();
                log.debug(functionName, `SO Updated: ${soID}`);
            }catch (error)
            {
                log.error(functionName, `Error: ${error.toString()}`);
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
            let functionName = "summarize";
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
                poRecID : objScript.getParameter({name: "custscript_bsp_mr_cb_po_rec_id"})
            }
            return objParams;
        }

        return {getInputData, map, reduce, summarize}

    });
