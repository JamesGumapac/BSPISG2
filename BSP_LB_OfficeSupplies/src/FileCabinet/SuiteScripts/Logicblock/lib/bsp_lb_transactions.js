/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', './bsp_lb_utils.js', './bsp_lb_items.js'], function (record, BSPLBUtils, BSPLBItems) {

    /**
     * Create Sales Order Record in NS
     * @param {*} objFields 
     * @param {*} objMappingFields
     * @param {*} customerRecordResult 
     * @param {*} itemRecordsResult 
     * @returns 
     */
     function createSalesOrderRecord(objFields, objMappingFields, customerRecordResult, itemRecordsResult){
        let objResult = {};
        let status = BSPLBUtils.constants().successStatus;
        let newRecordId = "";

        log.debug("createSalesOrderRecord", 
            {
                objFields: JSON.stringify(objFields)
            }
        );

        let salesOrderRecord = record.create({
            type: record.Type.SALES_ORDER,
            isDynamic: true,
        });

        salesOrderRecord.setValue({ fieldId: "entity", value: parseInt(customerRecordResult.nsID)});
        salesOrderRecord.setValue({ fieldId: "customform", value: parseInt(objFields.logicBlockForm)});

        for (const fieldMapping of objMappingFields.bodyFields) {
            let nsField = fieldMapping.netSuiteFieldId;
            let nsFieldName = fieldMapping.netSuiteFieldName;
            let lbField = fieldMapping.lbFieldId;
            let isLineItem = fieldMapping.isLineItem;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let defaultValue = fieldMapping.defaultValue;
            let lbValue = BSPLBUtils.getProp(objFields, lbField);

            log.debug("createSalesOrderRecord", 
                {
                    objMappingFields: JSON.stringify(fieldMapping),
                    lbValue: lbValue
                }
            );

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(nsFieldName == BSPLBUtils.recTypes().salesOrder){
                    if(fieldDataType == "String"){
                        if(!BSPLBUtils.isEmpty(lbValue)){
                            salesOrderRecord.setValue({ fieldId: nsField, value: lbValue });
                        }else{
                            if(!BSPLBUtils.isEmpty(defaultValue)){
                                salesOrderRecord.setValue({
                                    fieldId: nsField,
                                    value: defaultValue
                                })
                            }
                        }
                    }else if(fieldDataType == "Date"){
                        if(!BSPLBUtils.isEmpty(lbValue)){
                            let ddate = lbValue;
                            ddate = BSPLBUtils.convertResponseDateToNSDate(ddate);
                            salesOrderRecord.setValue({ fieldId: nsField, value: ddate });
                        }              
                    }
                }else{
                    let addressSubRecord = null;
                    if(nsFieldName == BSPLBUtils.recTypes().shippingAddress){
                        addressSubRecord = salesOrderRecord.getSubrecord({
                            fieldId: 'shippingaddress'
                        })  
                    }else{
                        addressSubRecord = salesOrderRecord.getSubrecord({
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
        processSalesOrderLines(salesOrderRecord, objFields.order, objMappingFields, itemRecordsResult);

        /**
         * Default values
         */
        salesOrderRecord.setValue({ fieldId: "shipmethod", value: ""});

        newRecordId = salesOrderRecord.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().salesOrder, objFields.order.Id, "Order");

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Process lines of Sales Order
     * @param {*} salesOrderRecord 
     * @param {*} order 
     * @param {*} objMappingFields 
     * @param {*} itemRecordsResult 
     */
    function processSalesOrderLines(salesOrderRecord, order, objMappingFields, itemRecordsResult){

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
                    salesOrderRecord.setCurrentSublistValue({ sublistId: strSublistID, fieldId: "item", value: itemRecId });

                    for (const fieldMapping of objMappingFields.lineFields) {
                        let nsSublistId = fieldMapping.sublistId;
                        let nsLineFieldId = fieldMapping.netSuiteFieldId;
                        let lbLineFieldId = fieldMapping.lbFieldId;
                        let lbValue = BSPLBUtils.getProp(itemDetail, lbLineFieldId);
    
                        log.debug("processSalesOrderLines", 
                            {
                                objMappingFields: JSON.stringify(fieldMapping),
                                lbValue: lbValue
                            });

                        if(nsSublistId == strSublistID){
                            if(!BSPLBUtils.isEmpty(lbValue)){
                                salesOrderRecord.selectNewLine({ sublistId: nsSublistId });    
                                salesOrderRecord.setCurrentSublistValue({ sublistId: nsSublistId, fieldId: nsLineFieldId, value: lbValue });            
                            }                                       
                        }
                   }
    
                    salesOrderRecord.commitLine({
                        sublistId: strSublistID,
                    });
                }                
            }       
        });
       
    }

    /**
     * Create Sales Order Record in NS
     * @param {*} order 
     * @param {*} objMappingFields 
     * @param {*} customerRecordResult 
     * @param {*} itemRecordsResult 
     * @returns 
     */
    function fetchSalesOrder(order, objMappingFields, customerRecordResult, itemRecordsResult, objLogicBlockForm){
        let functionName = "fetchSalesOrder";
        let salesOrderRecordResult = {};
        let salesOrderUpdated = false;
        try{   
            let salesOrderRecID = BSPLBUtils.getRecordInternalID(order.Id);
            if(salesOrderRecID){
                salesOrderUpdated = true;
                try{
                    BSPLBUtils.deleteMappedKey(order.Id);
                    BSPLBUtils.deleteTransaction(BSPLBUtils.recTypes().salesOrder, salesOrderRecID);
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
                logicBlockForm: objLogicBlockForm[0].value
            }
            let recordCreationResult = createSalesOrderRecord(objFields, objMappingFields, customerRecordResult, itemRecordsResult);
            if(recordCreationResult && recordCreationResult.recordId){
                internalId = recordCreationResult.recordId;
                salesOrderRecordResult = {nsID: internalId, logicBlockID: order.Id, salesOrderUpdated: salesOrderUpdated};
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
        return salesOrderRecordResult;
    }

  
    return {
		fetchSalesOrder: fetchSalesOrder
	};

});