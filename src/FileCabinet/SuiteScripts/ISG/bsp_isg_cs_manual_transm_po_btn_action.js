/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/url'],
/**
 * @param{message} message
 * @param{url} url
 */
function(message, url) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {}


    function transmitPO(purchaseOrderRecID){
        let stLogTitle = "transmitPO";
        try{
            console.log(stLogTitle, JSON.stringify(purchaseOrderRecID));

            let msg = message.create({
                title: "Confirmation",
                message: "Purchase Order sent for Transmission",
                type: message.Type.CONFIRMATION
            });     
            msg.show({
                duration: 10000
            });   
            setTimeout(10000);

            let parameters = {
                purchaseOrderRecID: purchaseOrderRecID
            };

            let stSuiteletUrl = url.resolveScript({
                scriptId: 'customscript_bsp_isg_sl_manual_transm',
                deploymentId: 'customdeploy_bsp_isg_sl_manual_transm',
                returnExternalUrl: false,
            });
      
            let suiteletUrl = url.format(stSuiteletUrl, parameters);
            window.ischanged = false;
            window.open(suiteletUrl, '_self');            
            return true;
        }catch (error) {
            console.log(stLogTitle, JSON.stringify(error));
        }
    }

    return {
        pageInit: pageInit,
        transmitPO: transmitPO
    };
    
});
