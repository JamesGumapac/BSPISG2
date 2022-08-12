/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/runtime', 'N/task', './lib/bsp_transmitions_util.js'],
    /**
 * @param{render} render
 */
    (runtime, task, BSPTransmitionsUtil) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            let functionName = "execute";
            try
            {
                log.debug(functionName, "************ EXECUTION STARTED ************");
                let transmitionQueueRecID = null;

                let paramsObj = getParameters();
                transmitionQueueRecID = paramsObj.transmitionQueueRecID;

                if(BSPTransmitionsUtil.isEmpty(transmitionQueueRecID)){
                    transmitionQueueRecID = BSPTransmitionsUtil.findNextTransmitionInQueue();
                }

                let transmitionRecord = BSPTransmitionsUtil.getTransmitionRecordFromQueue(transmitionQueueRecID);

                if(transmitionRecord){
                    let objMRTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: paramsObj.mr_script_id,
                        deploymentId: paramsObj.mr_script_dep_id,
                        params: {custscript_bsp_mr_transm_rec_id: transmitionRecord.value}
                    });
                    let intTaskID = objMRTask.submit();
                    log.debug(functionName, `MR Task submitted with ID: ${intTaskID} for Transmition: ${transmitionRecord.text}`);
                }else{
                    log.debug(functionName, `No transmition found to execute at this moment`);
                }
                
                log.debug(functionName, "************ EXECUTION FINISHED ************");
            } catch (error)
            {
                log.error(functionName, {error: error.toString()});
            }
        }

        /**
         * Retieves Script parameters set up in the Deployment Record
         * @returns {Object} Script parameters
        */
        const getParameters = () => {
            let objParams = {};

            let objScript = runtime.getCurrentScript();
            objParams = {
                transmitionQueueRecID : objScript.getParameter({name: "custscript_bsp_ss_transm_queue_id"}),
                mr_script_id : objScript.getParameter({name: "custscript_bsp_ss_mr_script_id"}),
                mr_script_dep_id : objScript.getParameter({name: "custscript_bsp_ss_mr_script_dep_id"})
            }

            return objParams;
        }

        return {execute}

    });
