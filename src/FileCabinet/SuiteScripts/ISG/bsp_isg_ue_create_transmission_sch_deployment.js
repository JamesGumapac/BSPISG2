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
                let transmitionSchedulerRec = scriptContext.newRecord;
                log.debug(functionName, JSON.stringify(type));
                if (type == scriptContext.UserEventType.CREATE || type == scriptContext.UserEventType.COPY) {
                    log.debug(functionName, "Schedule btn not displayed");
                }else{   
                    let scriptDeploymentID = transmitionSchedulerRec.getValue('custrecord_bsp_transm_schd_deployment_id');
                    if(!scriptDeploymentID){
                        let scriptID = transmitionSchedulerRec.getValue('custrecord_bsp_script_id');
                        let objForm = scriptContext.form;

                        let clientScriptFileId = search.create({
                            type: "file",
                            filters: [["name", "is", "bsp_isg_cs_redirect_to_deployment_btn.js"]],
                        }).run().getRange({ start: 0, end: 1 })[0].id;

                        objForm.clientScriptFileId = clientScriptFileId;
        
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
