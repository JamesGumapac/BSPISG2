/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url'],
/**
 * @param{url} url
 */
function(url) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) { }

    
    function fieldChanged(scriptContext){
        let functionName = "fieldChanged";
        try{
            let suitelet = scriptContext.currentRecord;
            console.log(functionName, scriptContext.fieldId);
            
            let selectedVendorID = suitelet.getValue({
                fieldId: 'custpage_trading_partner'
            });
            let selectedVendorName = suitelet.getText({
                fieldId: 'custpage_trading_partner'
            });

            let chkItemsReachedMinQty = suitelet.getValue({
                fieldId: 'custom_chk_reached_min_qty'
            });
            let chkItemsCloseToMinQty = suitelet.getValue({
                fieldId: 'custom_chk_close_min_qty'
            });
            let parameters = {
                custparam_selected_vendor: selectedVendorID,
                custparam_selected_vendor_name: selectedVendorName,
                custparam_chk_items_reached_min_qty: chkItemsReachedMinQty,
                custparam_chk_items_closeto_min_qty: chkItemsCloseToMinQty
            };
            let stSuiteletUrl = url.resolveScript({
                scriptId: 'customscript_bsp_isg_sl_carton_buy',
                deploymentId: 'customdeploy_bsp_isg_sl_carton_buy',
                returnExternalUrl: false,
                params: parameters
            });
            window.ischanged = false;
            window.open(stSuiteletUrl, '_self');
            
        }catch(error){
            console.log(functionName, JSON.stringify(error));
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
    
});
