/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', './lib/bsp_lb_utils.js', './lib/bsp_lb_packages.js', './lib/bsp_lb_login_api.js', './lib/bsp_lb_settings.js'],
    /**
 * @param{runtime} runtime
 */
    (runtime, BSPLBUtils, BSPLBPackages, BSPLBLoginAPI, BSPLBSettings) => {
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
            let outboundQueues = [];
            try{
                log.debug(functionName, "************ EXECUTION STARTED ************");
                let objScriptParams = getParameters();
                let settings = BSPLBUtils.getIntegrationSettings(objScriptParams.integrationSettingsRecID);
                let loginData = BSPLBLoginAPI.login(settings);

                let queues = BSPLBUtils.getOutboundQueues(BSPLBUtils.outboundQueueOperations().shipPackage);
                queues.run().each(function (result) {
                    let queueRecID = result.id;

                    let itemFulfillmentId = result.getValue({
                        name: "custrecord_bsp_lb_transaction",
                    });

                    let queueDateCreated = result.getValue({
                        name: "created",
                    });

                    outboundQueues.push({
                        queueRecID:queueRecID, 
                        itemFulfillmentId: itemFulfillmentId, 
                        queueDateCreated: queueDateCreated, 
                        settings: settings, 
                        loginData: loginData
                    });         

                    return true;
                });
            }catch (error){
                log.error(functionName, {error: error.message});
                let errorSource = "BSP | LB | MR | Ship Packages - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    error
                );
            }
            return outboundQueues;
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
                let objOutboundQueueData = reduceContext.values;
                let outboundQueueData = JSON.parse(objOutboundQueueData);

                let inboundQueueRecID = outboundQueueData.queueRecID;
                let settings = outboundQueueData.settings;
                let itemFulfillmentId = outboundQueueData.itemFulfillmentId;
                let dateCreated = outboundQueueData.queueDateCreated;
                let loginData = outboundQueueData.loginData;
                let updateRetryCount = false;

                let lbPackageResultObj = BSPLBPackages.createPackage(settings, loginData, itemFulfillmentId, dateCreated);
                log.debug(functionName,{lbPackageResultObj});

                if(!BSPLBUtils.isEmpty(lbPackageResultObj.packageId)){
                    let shipPackageResult = BSPLBPackages.shipPackage(settings, lbPackageResultObj);
                    log.debug(functionName,{shipPackageResult});
                    if(!BSPLBUtils.isEmpty(shipPackageResult)){
                        if(shipPackageResult == "true"){
                            log.debug(functionName, `Package ${lbPackageResultObj.packageId} has been shipped`);           
                        }else{
                            updateRetryCount = true;
                            log.error(functionName, `There was an error while Shipping Package: ${lbPackageResultObj.packageId}`);    
                        }          
                    }else{
                        updateRetryCount = true;
                        log.error(functionName, `There was an error while Shipping Package: ${lbPackageResultObj.packageId}`);    
                    }  
                }else{
                    updateRetryCount = true;
                }

                if(updateRetryCount){
                    BSPLBUtils.updateOutboundQueueRetryCount(inboundQueueRecID);
                }else{
                    BSPLBUtils.markQueueAsProcessed(inboundQueueRecID, "customrecord_bsp_lb_outbound_queue");
                }

            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
                let errorSource = "BSP | LB | MR | Ship Packages - " + functionName;
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
                let objScriptParams = getParameters();
                let deletedQueues = BSPLBUtils.deleteProcessedOutboundQueues(objScriptParams.integrationSettingsRecID, BSPLBUtils.outboundQueueOperations().shipPackage);
                log.audit(functionName, {'deletedProcessedQueues': deletedQueues});
            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
                let errorSource = "BSP | LB | MR | Ship Packages - " + functionName;
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
