/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/record', 'N/search'],
/**
 * @param{redirect} redirect
 */
function(url, record, search) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
    */
    function pageInit(context) { }


    function onClick_GoToDeployment(recID, scriptID) {
        try {
            let deploymentRec = record.create({
                type: record.Type.SCRIPT_DEPLOYMENT,
                isDynamic: true,
                defaultValues: {
                    script: scriptID
                }
            });
            deploymentRec.setValue('status', "SCHEDULED");
            let scriptExternalID = `_bsp_transm_schd_${recID}`;
            deploymentRec.setValue('scriptid', scriptExternalID); 
            let deploymentRecID = deploymentRec.save();

            let scriptDeploymentID = search.lookupFields({
                type: record.Type.SCRIPT_DEPLOYMENT,
                id: deploymentRecID,
                columns: 'scriptid'
            });

            record.submitFields({
                type: "customrecord_bsp_lb_transmition_schedule",
                id: recID,
                values: {
                    custrecord_bsp_transm_schd_deployment_id: scriptDeploymentID.scriptid.toLowerCase()
                },
                 options: {        
                     enableSourcing: false,        
                     ignoreMandatoryFields : true    
                }           
            });

            let output = url.resolveRecord({
                recordType: record.Type.SCRIPT_DEPLOYMENT,
                recordId: deploymentRecID,
                isEditMode: true
            });
            var objParameters = {};
            let deploymentURL = url.format(output, objParameters);

            window.open(deploymentURL);

        } catch (error) {
            console.log(error.message);
        }       
    }

    return {
        pageInit: pageInit,
        onClick_GoToDeployment: onClick_GoToDeployment
    };
    
});
