/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/search'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search) => {

        const beforeLoad = (scriptContext) => {
            let functionName = "beforeLoad";
            try{
                let type = scriptContext.type;
                log.debug(functionName, JSON.stringify(type));
                if (type == scriptContext.UserEventType.CREATE || type == scriptContext.UserEventType.COPY) {
                    log.debug(functionName, "Button for Going to Deployment will not be displayed");
                }else{
                    let transmitionSchedulerRec = scriptContext.newRecord;
                    let scriptDeploymentID = transmitionSchedulerRec.getValue('custrecord_bsp_transm_schd_deployment_id');
                    if(!scriptDeploymentID){
                        let scriptID = transmitionSchedulerRec.getValue('custrecord_bsp_script_id');
                        let objScript = runtime.getCurrentScript();
                        let objForm = scriptContext.form;
                        objForm.clientScriptFileId = objScript.getParameter('custscript_bsp_redirect_button_cs');
        
                        objForm.addButton({
                            id : 'custpage_goto_deployment',
                            label : 'Schedule',
                            functionName: 'onClick_GoToDeployment("' + transmitionSchedulerRec.id + '","' + scriptID + '")'
                        })
                    }
                }       
            }catch(error){
                log.error(functionName, JSON.stringify(error));
            }
        }   


        return {beforeLoad}

    });
