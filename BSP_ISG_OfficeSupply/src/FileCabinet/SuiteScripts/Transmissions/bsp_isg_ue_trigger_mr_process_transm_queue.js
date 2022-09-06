/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task', 'N/runtime'],
    /**
 * @param{task} task
 */
    (task, runtime) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let functionName = "afterSubmit";
            try{
                let objScript = runtime.getCurrentScript();
                let ss_script_id = objScript.getParameter({name: "custscript_bsp_ss_script_id"});
                let ss_script_dep_id = objScript.getParameter({name: "custscript_bsp_ss_script_dep_id"});

                let type = scriptContext.type;
                if (type == scriptContext.UserEventType.CREATE) {
                    let transmitionQueueRecID = scriptContext.newRecord.id;

                    let objMRTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: ss_script_id,
                        deploymentId: ss_script_dep_id,
                        params: {custscript_bsp_ss_transm_queue_id: transmitionQueueRecID}
                    });
                    let intTaskID = objMRTask.submit();
                    log.debug(functionName, `MR Task submitted with ID: ${intTaskID}`);
                }else if(type == scriptContext.UserEventType.DELETE){
                    let objMRTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: ss_script_id,
                        deploymentId: ss_script_dep_id
                    });
                    let intTaskID = objMRTask.submit();
                    log.debug(functionName, `MR Task submitted with ID: ${intTaskID} - No Queue ID passed`);
                }     
            }catch(error){
                log.error(functionName, {error: error.toString()});
            }
        }

        return {afterSubmit}

    });
