/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/runtime', 
    'N/https', 
    '../Lib/bsp_isg_transmitions_util.js', 
    '../Lib/bsp_isg_edi_settings.js', 
    '../Lib/xml_template_handler.js', 
    '../Lib/bsp_isg_as2_service.js', 
    '../Lib/bsp_isg_purchase_orders.js',
    '../Lib/bsp_isg_trading_partners.js'],
    /**
     * @param{runtime} runtime
     * @param{BSPTransmitionsUtil} BSPTransmitionsUtil
     */
    (runtime, https, BSPTransmitionsUtil, BSP_EDISettingsUtil, BSP_XMLTemplateHandler, BSP_AS2Service, BSP_POutil, BSPTradingParnters) => {
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
            let poRecID = null;
            try
            {
                log.debug(functionName, "************ EXECUTION STARTED ************");

                let paramsObj = getParameters();
                let transmitionRecID = paramsObj.transmitionRecID;
                let transmitionQueueID = paramsObj.transmitionQueueID;
                poRecID = paramsObj.poRecID;

                let ediSettings = BSP_EDISettingsUtil.getEDIsettings(paramsObj.environment);

                if(!BSPTransmitionsUtil.isEmpty(poRecID)){
                    log.debug(functionName, `PO transmission - Manual Process for PO ID: ${poRecID}`);

                    let puchaseOrderList = BSP_POutil.getPurchaseOrdersForTransmission(null, poRecID);
                    if(puchaseOrderList.length > 0){
                        let vendor = BSP_POutil.getVendor(poRecID);
                        let tranmsissionFields = BSP_POutil.getTransmissionFields(poRecID);
                        let tradingParnterInfo = BSPTradingParnters.getTradingPartnerInfo(vendor);

                        puchaseOrderList.forEach(po => {
                            transmitionDataList.push({
                                data: {
                                    ediSettings: ediSettings,
                                    transmissionData: tranmsissionFields,
                                    tradingPartner: tradingParnterInfo,
                                    purchaseOrder: po
                                }
                            })
                        });
                    }
                }else{
                    log.debug(functionName, `Searching POs created from Transmission Queue: ${transmitionQueueID}`);

                    let puchaseOrderList = BSP_POutil.getPurchaseOrdersForTransmission(transmitionQueueID, null);
                    log.debug(functionName, `Encountered: ${puchaseOrderList.length} POs`);
    
                    if(puchaseOrderList.length > 0){
                        let transmitionRecFields = BSPTransmitionsUtil.getFieldsFromTransmitionRecord(transmitionRecID);
                        let vendor = transmitionRecFields.vendor;
                        let tradingParnterInfo = BSPTradingParnters.getTradingPartnerInfo(vendor);
                        
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
                    }      
                }            
            } catch (error)
            {
                if(!BSPTransmitionsUtil.isEmpty(poRecID)){
                    BSP_POutil.updatePOtransmissionStatus(poRecID, BSP_POutil.transmitionPOStatus().transmissionFailed);
                }
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
            let poID = reduceContext.key;
            try{
                let tranmsissionData = JSON.parse(reduceContext.values);

                /**
                * For Essendant get the BOD ID
                */
                if(tranmsissionData.tradingPartner.name == BSPTransmitionsUtil.constants().essendant){
                    tranmsissionData.tradingPartner.documentControlNumber = BSPTradingParnters.getTradingPartnerBODId(tranmsissionData.tradingPartner.id);
                    tranmsissionData.transmissionData.dateCreated = BSPTransmitionsUtil.getXMLDate(new Date()); 
                }

                let templateId = tranmsissionData.tradingPartner.xmlTemplateFileID;
                let fileName = BSPTransmitionsUtil.buildFileName(tranmsissionData.purchaseOrder.purchaseOrderNumber);
                let outputFolder = tranmsissionData.tradingPartner.transmissionOutputFolderID;
                let xmlFileObj = BSP_XMLTemplateHandler.buildFileFromTemplate(templateId, tranmsissionData, fileName, outputFolder);
                tranmsissionData.xmlFileObj = xmlFileObj;
                
                let serverBodyParameters = BSP_AS2Service.buildRequestBody(tranmsissionData);
                let as2ServerResponse = BSP_AS2Service.runService(
                    {
                        httpMethod: https.Method.POST,
                        ediSettings: tranmsissionData.ediSettings, 
                        serverBodyParameters: serverBodyParameters
                    }
                );

                if (as2ServerResponse.code != 200 && as2ServerResponse.code != 201){
                    throw ('TRANSMISSION_ERROR', 'An internal error occurred.');
                }

                let jsonResponseStr = as2ServerResponse.body;
                let jsonObjResponse = JSON.parse(jsonResponseStr);

                BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().pendingAcknowledment);
                BSP_POutil.setPOMessageID(poID, jsonObjResponse);
                
                /**
                 * For Essendant update the BOD ID
                */
                if(tranmsissionData.tradingPartner.name == BSPTransmitionsUtil.constants().essendant){
                    BSPTradingParnters.updateTradingPartnerBODId(tranmsissionData.tradingPartner.id, tranmsissionData.tradingPartner.documentControlNumber);
                }
                
            }catch (error)
            {
                log.error(functionName, `Error Transmitting PO: ${error.toString()}`);

                BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().transmissionFailed);

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
                //BSPTransmitionsUtil.updateTransmissionQueueStatus(transmitionQueueID, BSPTransmitionsUtil.transmitionQueueStatus().transmitted);
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
                poRecID : objScript.getParameter({name: "custscript_bsp_mr_po_rec_id"}),
                environment: environment
            }
    
            return objParams;
        }

        return {getInputData, map, reduce, summarize}

    });
