/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/record'],
/**
 * @param{redirect} redirect
 */
function(url, record) {
    
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


    function onClick_RedirectToDeployment(deploymentID) {
        try {
            let output = url.resolveRecord({
                recordType: record.Type.SCRIPT_DEPLOYMENT,
                recordId: deploymentID,
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
        onClick_RedirectToDeployment: onClick_RedirectToDeployment
    };
    
});
