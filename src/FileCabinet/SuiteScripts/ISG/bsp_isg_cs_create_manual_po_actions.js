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
                let itemPrice = suitelet.getSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_so_item_price',
                    line: scriptContext.line
                });  
                itemPrice = parseFloat(itemPrice.substring(1));

                let poQty = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_po_item_qty'
                });
                let salesOrders = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_po_sales_orders'
                });

                let amount = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_sum_cost'
                });

                let selectedItemsArrayString = suitelet.getValue({
                    fieldId: 'custpage_item_queue'
                });
                let selectedItemsArray = [];
                if(!isEmpty(selectedItemsArrayString)){
                    selectedItemsArray = JSON.parse(selectedItemsArrayString);
                }

                let currentAmount = suitelet.getValue({
                    fieldId: 'custpage_total_po_amount'
                });
                currentAmount = parseFloat(currentAmount.substring(1));
                
                if(selectedItem){
                    selectedItemsArray.push({itemID: selectedItemID, poQty: poQty, itemPrice: itemPrice, salesOrders: salesOrders});
                    suitelet.setValue({
                        fieldId: 'custpage_item_queue',
                        value: JSON.stringify(selectedItemsArray)
                    });
                    let newAmount = parseFloat(currentAmount) + parseFloat(amount);
                    suitelet.setValue({
                        fieldId: 'custpage_total_po_amount',
                        value: `$ ${newAmount.toFixed(2)}`
                    });
                }else{
                    let indexOfItem = getItemIndex(selectedItemsArray,selectedItemID);
                    if (indexOfItem > -1) {
                        selectedItemsArray.splice(indexOfItem, 1)
                        suitelet.setValue({
                            fieldId: 'custpage_item_queue',
                            value: JSON.stringify(selectedItemsArray)
                        });

                        let newAmount = parseFloat(currentAmount) - parseFloat(amount);
                        suitelet.setValue({
                            fieldId: 'custpage_total_po_amount',
                            value: `$ ${newAmount.toFixed(2)}`
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
                let totalAmount = 0.00; 
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
                        let poQty = suitelet.getCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_po_item_qty'
                        }); 
                        let itemPrice = suitelet.getSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_so_item_price',
                            line: index
                        });
                        itemPrice = parseFloat(itemPrice.substring(1));

                        let amount = suitelet.getCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_item_sum_cost'
                        }); 
                        totalAmount += parseFloat(amount);
                        let salesOrders = suitelet.getCurrentSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_po_sales_orders'
                        });
                        selectedItemsArray.push({itemID: selectedItemID, poQty: poQty, itemPrice: itemPrice, salesOrders: salesOrders});
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
                suitelet.setValue({
                    fieldId: 'custpage_total_po_amount',
                    value: `$ ${totalAmount.toFixed(2)}`
                });
            }
            if (scriptContext.fieldId == 'custpage_po_item_qty') {

                let poQty = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_po_item_qty'
                });

                let cartonCost = suitelet.getSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_so_item_price',
                    line: scriptContext.line
                });
                cartonCost = parseFloat(cartonCost.substring(1));

                let currentLine = suitelet.selectLine({
                    sublistId: 'custpage_items_sublist',
                    line: scriptContext.line
                });
                currentLine.setCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_sum_cost',
                    value: (cartonCost * poQty).toFixed(2)
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

                let amount = 0.00;
                selectedItemsArray.forEach(element => {
                    let poQty = parseInt(element.poQty);
                    let cartonCost = (element.itemPrice);
                    amount += (poQty*cartonCost)
                });
                suitelet.setValue({
                    fieldId: 'custpage_total_po_amount',
                    value: `$${amount.toFixed(2)}`
                });
            }
            if (scriptContext.fieldId == 'custpage_account_number') {
                let selectedItemID = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_id'
                });
                let selectedAccountID = suitelet.getCurrentSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_account_number'
                });

                let accountsData = suitelet.getSublistValue({
                    sublistId: 'custpage_items_sublist',
                    fieldId: 'custpage_item_accounts',
                    line: scriptContext.line
                });
                let accountsDataArray = [];
                if(!isEmpty(accountsData)){
                    accountsDataArray = JSON.parse(accountsData);
                }
                let newAccountData = findAccount(accountsDataArray, selectedAccountID);
                if(newAccountData){
                    let boQty = suitelet.getSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_bo_item_qty',
                        line: scriptContext.line
                    });

                    let currentLine = suitelet.selectLine({
                        sublistId: 'custpage_items_sublist',
                        line: scriptContext.line
                    });
                    currentLine.setCurrentSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_so_item_price',
                        value: `$${newAccountData.itemCost}`
                    });
                    currentLine.setCurrentSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_min_item_qty',
                        value: newAccountData.minQuantity
                    });
                    let poQty = suitelet.getSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_po_item_qty',
                        line: scriptContext.line
                    });

                    poQty = parseInt(newAccountData.minQuantity);

                    if(poQty < parseInt(boQty))
                        poQty = parseInt(boQty);   

                    currentLine.setCurrentSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_po_item_qty',
                        value: poQty
                    });
                    poQty = suitelet.getSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_po_item_qty',
                        line: scriptContext.line
                    });
                    currentLine.setCurrentSublistValue({
                        sublistId: 'custpage_items_sublist',
                        fieldId: 'custpage_item_sum_cost',
                        value: (parseFloat(newAccountData.itemCost) * parseInt(poQty)).toFixed(2)
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

                        let poQty = suitelet.getSublistValue({
                            sublistId: 'custpage_items_sublist',
                            fieldId: 'custpage_po_item_qty',
                            line: scriptContext.line
                        });

                        selectedItemsArray[indexOfItem].poQty = poQty;
                        selectedItemsArray[indexOfItem].itemPrice = newAccountData.itemCost;
                        suitelet.setValue({
                            fieldId: 'custpage_item_queue',
                            value: JSON.stringify(selectedItemsArray)
                        });
                    }

                    let amount = 0.00;
                    selectedItemsArray.forEach(element => {
                        let poQty = parseInt(element.poQty);
                        let cartonCost = (element.itemPrice);
                        amount += (poQty*cartonCost)
                    });
                    suitelet.setValue({
                        fieldId: 'custpage_total_po_amount',
                        value: `$${amount.toFixed(2)}`
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


    /**
     *
     * Executes when a field is about to be changed by a user or client side call.
     * This event executes on fields added in beforeLoad user event scripts.
     * The following sample tasks can be performed:
     *  - Validate field lengths.
     *  - Restrict field entries to a predefined format.
     *  - Restrict submitted values to a specified range
     *  - Validate the submission against entries made in an associated field.
     *
     * @param context = { currentRecord: currentRecord.CurrentRecord, sublistId: string, fieldId: string, line: string, column: string }
     * @returns {boolean}
    */
    /*function validateField(scriptContext) {
        if(scriptContext.fieldId == 'custpage_item_sum_cost'){
            console.log("Validate field");
            return false;
        }
    }*/

    function saveRecord(scriptContext) {
        let logTitle = 'saveRecord';
        try{

            let amount = suitelet.getValue({
                fieldId: 'custpage_total_po_amount'
            });
            amount = parseFloat(amount.substring(1));

            let minAmount = suitelet.getValue({
                fieldId: 'custpage_min_total_po_amount'
            });
            minAmount = parseFloat(minAmount.substring(1));

            let selectedItemsArrayString = suitelet.getValue({
                fieldId: 'custpage_item_queue'
            });
            let selectedItemsArray = [];
            if(!isEmpty(selectedItemsArrayString)){
                selectedItemsArray = JSON.parse(selectedItemsArrayString);
            }

            if(selectedItemsArray.length > 0){
                if(amount && amount < minAmount){   
                    if (confirm(`Current amount $${amount} has not reached the minimum amount of $ ${minAmount}. Do you want to proceed?`)) {
                        return true;
                    } else {
                        return false;
                    }
                }else{
                    if (confirm(`Current amount for the Carton PO $${amount}. Do you want to proceed?`)) {
                        return true;
                    }else{
                        return false;
                    }
                }
            }else{
                alert("Please select at least on item from the list");
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

    function findAccount(accounts, accountID){
        for (let index = 0; index < accounts.length; index++) {
            const element = accounts[index];
            if(element.id == accountID){
                return element;
            }
        }
        return null;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
    
});
