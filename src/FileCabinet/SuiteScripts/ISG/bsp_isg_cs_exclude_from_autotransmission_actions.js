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
            
            let selectedVendorID = suitelet.getValue({
                fieldId: 'custpage_trading_partner'
            });
            let selectedVendorName = suitelet.getText({
                fieldId: 'custpage_trading_partner'
            });

            let chkItemsCartonBuy = suitelet.getValue({
                fieldId: 'custom_chk_items_wl_carton_buy'
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
                custparam_chk_items_closeto_min_qty: chkItemsCloseToMinQty,
                custparam_chk_items_wl_carton_buy: chkItemsCartonBuy
            };
            let stSuiteletUrl = url.resolveScript({
                scriptId: 'customscript_bsp_isg_sl_excl_from_autotr',
                deploymentId: 'customdeploy_bsp_isg_sl_excl_from_autotr',
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
