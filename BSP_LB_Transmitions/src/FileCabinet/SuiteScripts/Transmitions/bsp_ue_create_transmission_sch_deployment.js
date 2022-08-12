/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/redirect'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search, redirect) => {

        const beforeLoad = (scriptContext) => {
            let functionName = "beforeLoad";
            try{
                let transmitionSchedulerRec = scriptContext.newRecord;
                let deploymentID = transmitionSchedulerRec.getValue('custrecord_bsp_transm_schd_deployment_id');

                if(deploymentID){
                    let objScript = runtime.getCurrentScript();
					let objForm = scriptContext.form;
					objForm.clientScriptFileId = objScript.getParameter('custscript_bsp_redirect_button_cs');

					objForm.addButton({
						id : 'custpage_redirect_deployment',
						label : 'Update scheduled Deployment',
                        functionName: 'onClick_RedirectToDeployment("' + deploymentID + '")'
					})
                }

            }catch(error){
                log.error(functionName, JSON.stringify(error));
            }
        }   
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
                let type = scriptContext.type;
                if (type !== scriptContext.UserEventType.CREATE && type !== scriptContext.UserEventType.COPY) {
                    return;
                }

                let transmitionSchedulerRec = scriptContext.newRecord;
                let scriptID = transmitionSchedulerRec.getValue('custrecord_bsp_script_id');

                let deploymentRec = record.create({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    isDynamic: true,
                    defaultValues: {
                        script: scriptID
                    }
                });
                deploymentRec.setValue('status', "SCHEDULED");
                let scriptExternalID = `_bsp_transm_schd_${scriptContext.newRecord.id}`;
                deploymentRec.setValue('scriptid', scriptExternalID);              
                let deploymentRecID = deploymentRec.save();

                let scriptDeploymentID = search.lookupFields({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    id: deploymentRecID,
                    columns: 'scriptid'
                });

                record.submitFields({
                    type: "customrecord_bsp_lb_transmition_schedule",
                    id: scriptContext.newRecord.id,
                    values: {
                        custrecord_bsp_transm_schd_deployment_id: scriptDeploymentID.scriptid.toLowerCase()
                    },
                     options: {        
                         enableSourcing: false,        
                         ignoreMandatoryFields : true    
                    }           
                });

				redirect.toRecord(
                    {
                        id: deploymentRecID, 
					    type: record.Type.SCRIPT_DEPLOYMENT, 
					    isEditMode: true
                    }
                );

            }catch(error){
                log.error(functionName, JSON.stringify(error.message));
            }
        }

        return {beforeLoad, afterSubmit}

    });
