/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', './bsp_isg_lb_utils.js', './bsp_isg_lb_items.js', './bsp_isg_lb_ordersservice_api.js', './bsp_isg_lb_entities.js'], function (record, BSPLBUtils, BSPLBItems, LBOrdersAPI, BSPLBEntities) {

    /**
     * Create Transaction Record in NS
     * @param {*} objFields 
     * @param {*} objMappingFields
     * @param {*} customerRecordResult 
     * @param {*} itemRecordsResult 
     * @param {*} recType 
     * @param {*} settings 
     * @param {*} loginData 
     * @returns 
     */
     function createTransactionRecord(objFields, objMappingFields, customerRecordResult, itemRecordsResult, recType, settings, loginData){
        let objResult = {};
        let status = BSPLBUtils.constants().successStatus;
        let newRecordId = "";

        let transactionRecord = record.create({
            type: recType,
            isDynamic: true,
        });

        transactionRecord.setValue({ fieldId: "customform", value: parseInt(objFields.logicBlockForm)});
        transactionRecord.setValue({ fieldId: "entity", value: parseInt(customerRecordResult.nsID)});

        if(recType == record.Type.CASH_SALE){
           let account = !BSPLBUtils.isEmpty(settings.custrecord_bsp_lb_account) ? settings.custrecord_bsp_lb_account[0].value : null;
           let location = !BSPLBUtils.isEmpty(settings.custrecord_bsp_lb_default_location_trans) ? settings.custrecord_bsp_lb_default_location_trans[0].value : null;
           
            if(account){
                transactionRecord.setValue({ fieldId: "undepfunds", value: 'F'});
                transactionRecord.setValue({ fieldId: "account", value: account});
            }else{
                transactionRecord.setValue({ fieldId: "undepfunds", value: 'T'});
            }

            if(location){
                transactionRecord.setValue({ fieldId: "location", value: location});
            }
        }

        let objCustomerFields = BSPLBEntities.getFieldsFromCustomer(customerRecordResult.nsID);
        let routeCode = objCustomerFields.routeCode;
        let accountNumber = objCustomerFields.accountNumber;
        if(BSPLBUtils.isEmpty(routeCode)){
            routeCode = settings.custrecord_bsp_lb_default_route_code[0].value;
        }
        if(routeCode){
            transactionRecord.setValue({ fieldId: "custbody_bsp_isg_route_code", value: routeCode});
        }

        if(accountNumber){
            transactionRecord.setValue({ fieldId: "custbody_bsp_isg_cust_account_number", value: accountNumber});
        }
        
        if(!BSPLBUtils.isEmpty(objFields.order.CustomerPurchaseOrderNumber)){
            transactionRecord.setValue({ fieldId: "custbody_bsp_isg_lb_payment_method", value: BSPLBUtils.constants().purchaseOrder});
        }else{
            let paymentMethod = getOrderPaymentMethod(settings, loginData, objFields.order.Id);
            if(paymentMethod){
                transactionRecord.setValue({ fieldId: "custbody_bsp_isg_lb_payment_method", value: paymentMethod});
            }           
        }

        for (const fieldMapping of objMappingFields.bodyFields) {
            let nsField = fieldMapping.netSuiteFieldId;
            let nsFieldName = fieldMapping.netSuiteFieldName;
            let lbField = fieldMapping.lbFieldId;
            let isLineItem = fieldMapping.isLineItem;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let defaultValue = fieldMapping.defaultValue;
            let lbValue = BSPLBUtils.getProp(objFields, lbField);

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(nsFieldName == BSPLBUtils.recTypes().salesOrder || nsFieldName == BSPLBUtils.recTypes().cashSale){
                    if(!BSPLBUtils.isEmpty(lbValue)){
                        if(fieldDataType == "String"){
                            transactionRecord.setValue({ fieldId: nsField, value: lbValue });
                        }else if(fieldDataType == "Date"){
                            let ddate = lbValue;
                            ddate = BSPLBUtils.convertResponseDateToNSDate(ddate);
                            transactionRecord.setValue({ fieldId: nsField, value: ddate });
                        }else if(fieldDataType == "Integer"){               
                            transactionRecord.setValue({ fieldId: nsField, value: parseInt(lbValue) });                       
                        } else if(fieldDataType == "Double"){               
                            transactionRecord.setValue({ fieldId: nsField, value: parseFloat(lbValue) });                       
                        }                                
                    }else{
                        if(!BSPLBUtils.isEmpty(defaultValue)){
                            transactionRecord.setValue({
                                fieldId: nsField,
                                value: defaultValue
                            })
                        } 
                    }
                }else{
                    let addressSubRecord = null;
                    if(nsFieldName == BSPLBUtils.recTypes().shippingAddress){
                        addressSubRecord = transactionRecord.getSubrecord({
                            fieldId: 'shippingaddress'
                        })  
                    }else{
                        addressSubRecord = transactionRecord.getSubrecord({
                            fieldId: 'billingaddress'
                        })
                    }
                    if(addressSubRecord){
                        if(!BSPLBUtils.isEmpty(lbValue)){
                            addressSubRecord.setValue({
                                fieldId: nsField,
                                value: lbValue
                            })
                        }else{
                            if(!BSPLBUtils.isEmpty(defaultValue)){
                                addressSubRecord.setValue({
                                    fieldId: nsField,
                                    value: defaultValue
                                })
                            }
                        }                                                             
                    }
                }                            
            }
        }
        processTransactionLines(transactionRecord, objFields.order, objMappingFields, itemRecordsResult);

        /**
         * Default values
         */
        transactionRecord.setValue({ fieldId: "shipmethod", value: ""});

        newRecordId = transactionRecord.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, recType, objFields.order.Id, "Order");

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Process lines of Sales Order
     * @param {*} transactionRecord 
     * @param {*} order 
     * @param {*} objMappingFields 
     * @param {*} itemRecordsResult 
     */
    function processTransactionLines(transactionRecord, order, objMappingFields, itemRecordsResult){
        let lineItems = [];
        if(order.LineItems.LineItem.length && order.LineItems.LineItem.length > 0){
            lineItems = order.LineItems.LineItem;
        }else{
            lineItems.push(order.LineItems.LineItem);
        }

        let strSublistID = "item";
        lineItems.forEach(itemDetail => {
            let productSKU = itemDetail.ProductSku;
            if(productSKU){
                let itemRecId = BSPLBItems.getItemNetSuiteRecID(productSKU, itemRecordsResult);
                if(itemRecId){
                    transactionRecord.setCurrentSublistValue({ sublistId: strSublistID, fieldId: "item", value: itemRecId });

                    let excludeItemFromTransmission = BSPLBItems.getItemField(itemRecId, "custitem_bsp_isg_excl_from_auto_transm");
                    
                    if(excludeItemFromTransmission){
                        transactionRecord.setCurrentSublistValue({ sublistId: strSublistID, fieldId: "custcol_bsp_isg_exclude_auto_transm", value: BSPLBUtils.constants().excludeFromTransmission});
                    }

                    for (const fieldMapping of objMappingFields.lineFields) {
                        let nsSublistId = fieldMapping.sublistId;
                        let nsLineFieldId = fieldMapping.netSuiteFieldId;
                        let lbLineFieldId = fieldMapping.lbFieldId;
                        let fieldDataType = fieldMapping.lbFieldDataType;
                        let defaultValue = fieldMapping.defaultValue;
                        let lbValue = BSPLBUtils.getProp(itemDetail, lbLineFieldId);
                        let isSetValue = fieldMapping.isSetValue;

                        if(nsSublistId == strSublistID){
                            if(!BSPLBUtils.isEmpty(lbValue)){
                                transactionRecord.selectNewLine({ sublistId: nsSublistId });  
                                if(isSetValue){
                                    let searchFilter = fieldMapping.lbFieldSearchFilter;
                                    let searchRecord = fieldMapping.lbFieldSearchRecord;
                                    let searchColumn = fieldMapping.lbFieldSearchColumn;
                                    let searchOperator = fieldMapping.lbFieldSearchOperator;
                                    let resultValue =  BSPLBUtils.searchRecordToGetInternalId(
                                        lbValue,
                                        searchFilter,
                                        searchRecord,
                                        searchColumn,
                                        searchOperator
                                    );
                                    if(!BSPLBUtils.isEmpty(resultValue)){
                                        transactionRecord.setCurrentSublistValue({sublistId: nsSublistId, fieldId: nsLineFieldId, value: resultValue });
                                    }           
                                }else{
                                    if(fieldDataType == "String"){               
                                        transactionRecord.setCurrentSublistValue({ sublistId: nsSublistId, fieldId: nsLineFieldId, value: lbValue });
                                    } else if(fieldDataType == "Integer"){ 
                                        transactionRecord.setCurrentSublistValue({ sublistId: nsSublistId, fieldId: nsLineFieldId, value: parseInt(lbValue) });                                  
                                    } else if(fieldDataType == "Double"){        
                                        transactionRecord.setCurrentSublistValue({ sublistId: nsSublistId, fieldId: nsLineFieldId, value: parseFloat(lbValue) });                          
                                    }     
                                }
                            }else if(!BSPLBUtils.isEmpty(defaultValue)){
                                transactionRecord.setCurrentSublistValue({sublistId: nsSublistId, fieldId: nsLineFieldId, value: defaultValue });
                            }                                       
                        }
                    }  
                    transactionRecord.commitLine({
                        sublistId: strSublistID,
                    });
                }                
            }       
        });   
    }

    /**
     * Create Transaction Record in NS or update it if it already exists
     * @param {*} order 
     * @param {*} objMappingFields 
     * @param {*} customerRecordResult 
     * @param {*} itemRecordsResult 
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} recType 
     * @returns 
     */
    function fetchTransaction(order, objMappingFields, customerRecordResult, itemRecordsResult, settings, loginData, recType){
        let functionName = "fetchTransaction";
        let transactionRecordResult = {};
        let transactionUpdated = false;
        try{   
            let transactionRecID = BSPLBUtils.getRecordInternalID(order.Id);
            if(transactionRecID){
                transactionUpdated = true;
                try{
                    BSPLBUtils.deleteMappedKey(order.Id);
                    BSPLBUtils.deleteTransaction(recType, transactionRecID);
                }catch(error){
                    log.error(functionName, {error: error.message});
                    let errorDetail = JSON.stringify({error: error.message})
                    let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
                    BSPLBUtils.createErrorLog(
                        errorSource,
                        error.message,
                        errorDetail
                    );
                }        
            }

            let objFields = {
                order: order,
                ShippingAddress: order.ShippingAddress,
                BillingAddress: order.BillingAddress,
                customerRecordResult: customerRecordResult,
                itemRecordsResult: itemRecordsResult,
                logicBlockForm: (recType == record.Type.CASH_SALE ? settings.custrecord_bsp_lb_cash_sale_form[0].value : settings.custrecord_bsp_lb_sales_order_form[0].value)
            }
            let recordCreationResult = createTransactionRecord(objFields, objMappingFields, customerRecordResult, itemRecordsResult, recType, settings, loginData);
            if(recordCreationResult && recordCreationResult.recordId){
                internalId = recordCreationResult.recordId;
                transactionRecordResult = {nsID: internalId, logicBlockID: order.Id, transactionUpdated: transactionUpdated};
            }
                                 
        }catch(error){
            log.error(functionName, {error: error.message});
            let errorDetail = JSON.stringify({error: error.message})
            let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
            BSPLBUtils.createErrorLog(
                errorSource,
                error.message,
                errorDetail
            );
        }      
        return transactionRecordResult;
    }

    /**
     * Returns true if Logicblock Order is already paid
     * @param {*} logicBlockOrder 
     * @returns 
     */
    function orderPaid(logicBlockOrder){
        let paymentStatus = logicBlockOrder.PaymentStatus;
        return (paymentStatus == BSPLBUtils.constants().statusPaid);
    }

    /**
     * Returns the Payment Method selected for the Logicblock Order
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} logicBlockOrderID 
     * @returns 
     */
    function getOrderPaymentMethod(settings, loginData, logicBlockOrderID){
        let orderPaymentMethod = null;
        let paymentsResult = LBOrdersAPI.getOrderPayments(settings, loginData, logicBlockOrderID);
        if(!BSPLBUtils.isEmpty(paymentsResult)){
            let logicBlockPayment = paymentsResult[0];
            orderPaymentMethod = logicBlockPayment.PaymentMethodName;
        }
        return orderPaymentMethod;
    }

    return {
		fetchTransaction: fetchTransaction,
        orderPaid: orderPaid
	};

});