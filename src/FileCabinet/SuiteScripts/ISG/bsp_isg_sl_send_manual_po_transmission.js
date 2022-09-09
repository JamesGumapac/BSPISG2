/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/runtime', 'N/redirect', 'N/task', './Lib/bsp_isg_purchase_orders.js'],
    /**
     * @param{record} record
     * @param{runtime} runtime
     * @param{redirect} redirect
     * @param{task} task
     */
    (record, runtime, redirect, task, BSP_POutil) => {
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
                log.debug(functionName, "************ EXECUTION STARTED ************");

                let requestParam = scriptContext.request.parameters;
                let purchaseOrderRecID = requestParam.purchaseOrderRecID;
                log.debug(functionName, `Manual Transmission for PO ID: ${purchaseOrderRecID}`);

                let paramsObj = getParameters();
                let objMRTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: paramsObj.mr_script_id,
                    deploymentId: paramsObj.mr_script_dep_id,
                    params: {
                        custscript_bsp_mr_transm_queue: null,
                        custscript_bsp_mr_transm_rec: null,
                        custscript_bsp_mr_po_rec_id: purchaseOrderRecID
                    }
                });
                let intTaskID = objMRTask.submit();
                log.debug(functionName, `MR Task submitted with ID: ${intTaskID} for PO Id: ${purchaseOrderRecID}`);

                BSP_POutil.updatePOtransmissionStatus(purchaseOrderRecID, BSP_POutil.transmitionPOStatus().transmitting);

                redirect.toRecord({
                    type: record.Type.PURCHASE_ORDER,
                    id: parseInt(purchaseOrderRecID)
                });
            }catch(error) {
                log.error(functionName, {error: error.toString()});
            };
        }

        /**
         * Retieves Script parameters set up in the Deployment Record
         * @returns {Object} Script parameters
        */
         const getParameters = () => {
            let objParams = {};
            let objScript = runtime.getCurrentScript();
            objParams = {
                mr_script_id : objScript.getParameter({name: "custscript_bsp_sl_transmit_po_script"}),
                mr_script_dep_id : objScript.getParameter({name: "custscript_bsp_sl_transmit_po_dep"})
            }
    
            return objParams;
        }

        return {onRequest}

    });
