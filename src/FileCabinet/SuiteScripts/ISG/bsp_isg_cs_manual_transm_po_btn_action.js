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
            /**
             * TODO - Transmit PO
             */
        }catch (error) {
            console.log(stLogTitle, JSON.stringify(error));
        }
    }

    return {
        pageInit: pageInit,
        transmitPO: transmitPO
    };
    
});
