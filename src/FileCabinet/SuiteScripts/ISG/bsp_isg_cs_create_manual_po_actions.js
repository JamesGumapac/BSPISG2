/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/ui/message'],
/**
 * @param{url} url
 * @param{message} message
 */
function(url, message) {
    var suitelet = null;
    
    function pageInit(scriptContext) {
        let logTitle = 'pageInit';
        try {
            suitelet = scriptContext.currentRecord;    
            
            let showMsg = suitelet.getValue({
                fieldId: 'custpage_show_msg'
            });
    
            if (showMsg) {
                let myMsg = message.create({
                    title: "Error",
                    message: showMsg,
                    type: message.Type.ERROR
                });
    
                suitelet.setValue({
                    fieldId: 'custpage_show_msg',
                    value: ''
                });
    
                myMsg.show({
                    duration: 4000
                });
            }  
        } catch (error) {
            console.log(logTitle, error.message);
        }
    }

    function fieldChanged(scriptContext) {
        let logTitle = 'fieldChanged';
        try {
            if (scriptContext.fieldId == 'custpage_vendors') {
                let selectedVendorID = suitelet.getValue({
                    fieldId: 'custpage_vendors'
                });
                let parameters = {
                    custparam_vendorSelected: selectedVendorID
                };
                let stSuiteletUrl = url.resolveScript({
                    scriptId: 'customscript_bsp_isg_sl_create_manual_po',
                    deploymentId: 'customdeploy_bsp_isg_sl_create_manual_po',
                    returnExternalUrl: false,
                    params: parameters
                });
                window.ischanged = false;
                window.open(stSuiteletUrl, '_self');
            }
            if (scriptContext.fieldId == 'custpage_item_selected') {
                let selectedItem = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_selected'
                });
                let selectedItemID = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_id'
                });
                let selectedLineItemID = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_so_item_line_id'
                }); 
                let poQty = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_po_item_qty'
                });          
                let salesOrders = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_po_sales_orders'
                });

                let selectedItemsArrayString = suitelet.getValue({
                    fieldId: 'custpage_item_queue'
                });
                let selectedItemsArray = [];
                if(!isEmpty(selectedItemsArrayString)){
                    selectedItemsArray = JSON.parse(selectedItemsArrayString);
                }
                
                if(selectedItem){
                    selectedItemsArray.push({itemID: selectedItemID, selectedLineItemID: selectedLineItemID, poQty: poQty, salesOrders: salesOrders});
                    suitelet.setValue({
                        fieldId: 'custpage_item_queue',
                        value: JSON.stringify(selectedItemsArray)
                    });
                }else{
                    let indexOfItem = getItemIndex(selectedItemsArray,selectedItemID);
                    if (indexOfItem > -1) {
                        selectedItemsArray.splice(indexOfItem, 1)
                        suitelet.setValue({
                            fieldId: 'custpage_item_queue',
                            value: JSON.stringify(selectedItemsArray)
                        });
                    }
                }
            }
            if(scriptContext.fieldId == 'custpage_select_all'){
                let fieldSelecteAll = suitelet.getValue({
                    fieldId: 'custpage_select_all'
                });
                let itemCount = suitelet.getLineCount({
                    sublistId: 'custpage_items_sublist'
                });
                let selectedItemsArray = [];  
                if(fieldSelecteAll){      
                    for (let index = 0; index < itemCount; index++) {
                        let currentLine = suitelet.selectLine({
                            sublistId: 'custpage_items_sublist',
                            line: index
                        });
                        currentLine.setCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_item_selected',
                            value: true
                        });
    
                        let selectedItemID = suitelet.getSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_item_id',
                            line: index
                        });
                        let selectedLineItemID = suitelet.getCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_so_item_line_id'
                        }); 
                        let poQty = suitelet.getCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_po_item_qty'
                        });  
                        let salesOrders = suitelet.getCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_po_sales_orders'
                        });
                        selectedItemsArray.push({itemID: selectedItemID, selectedLineItemID: selectedLineItemID, poQty: poQty, salesOrders: salesOrders});
                    }
                }else{
                    for (let index = 0; index < itemCount; index++) {
                        let currentLine = suitelet.selectLine({
                            sublistId: 'custpage_items_sublist',
                            line: index
                        });
                        currentLine.setCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_item_selected',
                            value: false
                        });
                    }
                }
                suitelet.setValue({
                    fieldId: 'custpage_item_queue',
                    value: JSON.stringify(selectedItemsArray)
                });
            }
            if (scriptContext.fieldId == 'custpage_po_item_qty') {

                let poQty = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_po_item_qty'
                });
                let selectedItemID = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_id'
                });
                
                let selectedItemsArrayString = suitelet.getValue({
                    fieldId: 'custpage_item_queue'
                });
                let selectedItemsArray = [];
                if(!isEmpty(selectedItemsArrayString)){
                    selectedItemsArray = JSON.parse(selectedItemsArrayString);
                }
                
                let indexOfItem = getItemIndex(selectedItemsArray,selectedItemID);
                if (indexOfItem > -1) {
                    selectedItemsArray[indexOfItem].poQty = poQty
                    suitelet.setValue({
                        fieldId: 'custpage_item_queue',
                        value: JSON.stringify(selectedItemsArray)
                    });
                }
                
            }
        } catch (error) {
            console.log(logTitle, error.message);
        }   
    }

    function getItemIndex(items, itemID){
        for (let index = 0; index < items.length; index++) {
            const element = items[index];
            if(element.itemID == itemID){
                return index;
            }
        }     
        return -1;
    }

    function saveRecord(scriptContext) {
        let logTitle = 'saveRecord';
        try{

            let selectedVendor = suitelet.getValue({
                fieldId: 'custpage_vendors'
            });

            let selectedItemsArrayString = suitelet.getValue({
                fieldId: 'custpage_item_queue'
            });
            let selectedItemsArray = [];
            if(!isEmpty(selectedItemsArrayString)){
                selectedItemsArray = JSON.parse(selectedItemsArrayString);
            }

            if(!isEmpty(selectedVendor) && selectedVendor != "custpage_empty_vendor"){
                if(selectedItemsArray.length > 0){
                    return true;
                }else{
                    alert("Please select at least on item from the list");
                }
            }else{
                alert("Please select a Vendor to proceed");
            }
        } catch (error) {
            console.log(logTitle, error.message);
        }
    }

    function isEmpty(value) {
        var stLogTitle = 'isEmpty';
        try {
            if (value == null || value == '' || (!value) || value == 'undefined') {
                return true;
            }
            return false;
        } catch (error) {
            console.log(stLogTitle, error);
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
    
});
