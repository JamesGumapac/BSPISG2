/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/ui/message', 'N/url', 'N/https'],
/**
 * @param{record} record
 * @param{dialog} dialog
 * @param{message} message
 */
function(record, dialog, message, url, https) {
    
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

    /**
     * Client side function to call Cancel Order
     * @param {*} params 
     */
    function cancelOrderLB(params){
        alert("Sending Cancellation. Please wait...");
        let suiteletURL = url.resolveScript({
            scriptId: "customscript_bsp_isg_sl_lb_sync_order",
            deploymentId: "customdeploy_bsp_isg_sl_lb_sync_order",
            returnExternalUrl: true,
        });
        let response = https.post({
            url: suiteletURL,
            body: {
                salesOrderId: params.salesOrderId,
                logicblockId: params.logicblockId,
                isCancellation: true
            },
        });

        let returnMessage = JSON.parse(response.body);
        showResponseToUser(returnMessage);
        location.reload();
    }

    /**
     * Client side function to call Sync Order
     * @param {*} params 
     */
    function syncOrderLB(params){
        alert("Syncronizing. Please wait...");
        let suiteletURL = url.resolveScript({
            scriptId: "customscript_bsp_isg_sl_lb_sync_order",
            deploymentId: "customdeploy_bsp_isg_sl_lb_sync_order",
            returnExternalUrl: true,
        });
        let response = https.post({
            url: suiteletURL,
            body: {
                salesOrderId: params.salesOrderId,
                logicblockId: params.logicblockId,
                isCancellation: false
            },
        });

        let returnMessage = JSON.parse(response.body);
        showResponseToUser(returnMessage);
        location.reload();
    }    

    /**
    * Show response to the user if the was successfully uploaded or not
    * @param {*} response
    */
    function showResponseToUser(response) {
        if (response[0].failed === false) {
            const infoMessage = message.create({
                title: "CONFIRMATION",
                message: response[0].message,
                type: message.Type.CONFIRMATION,
            });
            infoMessage.show({
                duration: 10000
            });
        } else {
            const infoMessage = message.create({
                title: "FAILED",
                message: response[0].message,
                type: message.Type.ERROR,
            });
            infoMessage.show({
                duration: 10000
            });     
        }
    }

    return {
        pageInit: pageInit,
        cancelOrderLB: cancelOrderLB,
        syncOrderLB: syncOrderLB
    };
    
});
