/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/record', 'N/redirect', 'N/task', 'N/url'],
    /**
     * @param{record} record
     * @param{redirect} redirect
     */
    (runtime, record, redirect, task, url) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let functionName = 'onRequest';
            try{
                if (scriptContext.request.method === 'GET') {
                    let requestParam = scriptContext.request.parameters;
               
                    let cartonBuyRecID = processParam(requestParam);
                    let recTypeID = getRecTypeID(cartonBuyRecID);
                    let accountID = runtime.accountId;
                    let redirectURL = buildRedirectURL(accountID, recTypeID);

                    try{
                        let objMRTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: "customscript_bsp_isg_mr_excl_from_auto",
                            deploymentId: "customdeploy_bsp_isg_mr_excl_from_auto",
                            params: {
                                custscript_bsp_mr_cartonbuy_rec_id: cartonBuyRecID
                            }
                        });
                        let intTaskID = objMRTask.submit();
                        log.debug(functionName, `MR Task submitted with ID: ${intTaskID}`);
                    }catch(error) {
                        log.error(functionName, {error: error.toString()});
                    }
                    
                    redirect.redirect({
                        url: redirectURL,
                        parameters: {}
                    });
                }       
            }catch(error) {
                log.error(functionName, {error: error.toString()});
            }
        }

        const processParam = (requestParam) =>{
            let param = requestParam["recID"];
            return param;
        }

        const getRecTypeID = (recID) => {
            let outputURL = url.resolveRecord({
                recordType: 'customrecord_bsp_isg_cartonbuy_items_req',
                recordId: parseInt(recID),
                isEditMode: false
            });

            let idMatch = (/\brectype=(\d+)/).exec(outputURL);
            return idMatch ? idMatch[1] : null;         
        }
        
        const buildRedirectURL = (accountID, recTypeID) => {
            return "https://"+accountID+".app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype="+recTypeID;
        }

        return {onRequest}

    });
