/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', './lib/bsp_transmitions_util.js', './lib/bsp_edi_settings.js', './lib/xml_template_handler.js', './lib/bsp_as2_service.js'],
    /**
     * @param{runtime} runtime
     * @param{BSPTransmitionsUtil} BSPTransmitionsUtil
     */
    (runtime, BSPTransmitionsUtil, BSP_EDISettingsUtil, BSP_XMLTemplateHandler, BSP_AS2Service) => {
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
            let transmitionDataList = [];
            try
            {
                log.debug(functionName, "************ EXECUTION STARTED ************");

                let paramsObj = getParameters();
                let transmitionRecID = paramsObj.transmitionRecID;
                let transmitionQueueID = paramsObj.transmitionQueueID;
                log.debug(functionName, `Searching POs created from Transmission Queue: ${transmitionQueueID}`);

                let puchaseOrderList = BSPTransmitionsUtil.getPurchaseOrdersForTransmission(transmitionQueueID);

                let ediSettings = BSP_EDISettingsUtil.getEDIsettings(paramsObj.environment);
                
                let transmitionRecFields = BSPTransmitionsUtil.getFieldsFromTransmitionRecord(transmitionRecID);
                let vendor = transmitionRecFields.vendor;
                let tradingParnterInfo = BSPTransmitionsUtil.getTradingPartnerInfo(vendor);
                
                puchaseOrderList.forEach(po => {
                    transmitionDataList.push({
                        data: {
                            ediSettings: ediSettings,
                            transmissionData: transmitionRecFields,
                            tradingPartner: tradingParnterInfo,
                            purchaseOrder: po
                        }
                    })
                });
            } catch (error)
            {
                log.error(functionName, {error: error.toString()});
            }
            return transmitionDataList;
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
                let tranmsission = JSON.parse(mapContext.value);
                log.debug(functionName, `Tranmission PO: ${JSON.stringify(tranmsission)}`);
                let poId = tranmsission.data.purchaseOrder.purchaseOrderID;
                /*
                    TODO:   If we are going to send Essendant multiple POs per transmission
                            Then we have to group the POs by Transmission ID before sending to Reduce stage
                */
                mapContext.write({
                    key: poId, 
                    value: tranmsission.data
                });
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
                let tranmsissionData = JSON.parse(reduceContext.values);

                let templateId = tranmsissionData.tradingPartner.xmlTemplateFileID;
                let fileName = `${tranmsissionData.ediSettings.name}_PO${tranmsissionData.purchaseOrder.purchaseOrderNumber}`;
                let outputFolder = tranmsissionData.tradingPartner.transmissionOutputFolderID;
                let xmlFileObj = BSP_XMLTemplateHandler.buildFileFromTemplate(templateId, tranmsissionData, fileName, outputFolder);
                tranmsissionData.xmlFileObj = xmlFileObj;
                let serverBodyParameters = BSP_AS2Service.buildRequestBody(tranmsissionData);
                log.debug(functionName, `server Body Parameters: ${JSON.stringify(serverBodyParameters)}`);

                let as2ServerResponse = BSP_AS2Service.runService(tranmsissionData.ediSettings, serverBodyParameters);
                /*
                    TODO
                     - Send to AS2 service
                     - if sent correctly, update Transmission queue Rec as transmitted. If not, update as tranmsision failed
                */
            }catch (error)
            {
                log.error(functionName, `Error Transmitting PO: ${error.toString()}`);
                let errorSource = "BSP | MR | Transmit POs - " + functionName;
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
            log.debug("Account Environment", `ENV: ${environment}`);

            let objScript = runtime.getCurrentScript();
            objParams = {
                transmitionQueueID : objScript.getParameter({name: "custscript_bsp_mr_transm_queue"}),
                transmitionRecID : objScript.getParameter({name: "custscript_bsp_mr_transm_rec"}),
                environment: environment
            }
    
            return objParams;
        }

        return {getInputData, map, reduce, summarize}

    });
