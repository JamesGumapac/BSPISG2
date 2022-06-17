/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', './bsp_lb_utils.js', './bsp_lb_catalogservice_api.js'], function (record, BSPLBUtils, LBCatalogAPI) {

    /**
     * Create Vendor Record in NS
     * @param {*} objFields 
     * @param {*} objMappingFields 
     * @returns 
     */
    function createVendorRecord(objFields, objMappingFields){
        let objResult = {};
        let status = BSPLBUtils.constants().successStatus;
        let newRecordId = "";

        log.debug("createVendorRecord", 
            {
                objFields: JSON.stringify(objFields)
            }
        );

        let vendorRec = record.create({
            type: record.Type.VENDOR,
            isDynamic: true,
        });

        for (const fieldMapping of objMappingFields.bodyFields) {
            let nsField = fieldMapping.netSuiteFieldId;
            let lbField = fieldMapping.lbFieldId;
            let isLineItem = fieldMapping.isLineItem;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let lbValue = BSPLBUtils.getProp(objFields, lbField);

            log.debug("createVendorRecord", 
                {
                    objFields: JSON.stringify(fieldMapping),
                    lbValue: JSON.stringify(lbValue)
                }
            );

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(fieldDataType == "String"){
                    vendorRec.setValue({ fieldId: nsField, value: lbValue });
                }                 
            }
        }

        newRecordId = vendorRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().vendor, objFields.vendor.Id, BSPLBUtils.recTypes().vendor)

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Get Vendor Records or create them if they do not exist
     * @param {*} settings 
     * @param {*} loginData 
     * @returns 
     */
    function fetchVendors(settings, loginData){
        let functionName = "fetchVendors";
        let vendorRecordsResult = [];
        try{
            let recordType = BSPLBUtils.recTypes().vendor;
            let objMappingFields = BSPLBUtils.getMappingFields(recordType, false);
    
            let lbVendorsResult = LBCatalogAPI.getVendors(settings, loginData);
    
            lbVendorsResult.lbVendors.forEach(vendorElement => {
                let internalId = BSPLBUtils.getRecordInternalID(vendorElement.Id);
                if(internalId){
                    vendorRecordsResult.push({nsID: internalId, logicBlockID: vendorElement.Id})
                }else{
                    let objFields = {
                        vendor: vendorElement
                    }
                    let recordCreationResult = createVendorRecord(objFields, objMappingFields);
                    if(recordCreationResult && recordCreationResult.recordId){
                        internalId = recordCreationResult.recordId;
                        vendorRecordsResult.push({nsID: internalId, logicBlockID: vendorElement.Id})
                    }   
                }
            });
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
        return vendorRecordsResult;
    }

    /**
     * Create Customer Record in NS
     * @param {*} objFields 
     * @param {*} objMappingFields 
     * @returns 
     */
     function createCustomerRecord(objFields, objMappingFields){
        let objResult = {};
        let status = BSPLBUtils.constants().successStatus;
        let newRecordId = "";

        log.debug("createCustomerRecord", 
            {
                objFields: JSON.stringify(objFields)
            }
        );

        let customerRec = record.create({
            type: record.Type.CUSTOMER,
            isDynamic: true,
        });

        customerRec.setValue({ fieldId: "isperson", value: 'T' });

        for (const fieldMapping of objMappingFields.bodyFields) {
            let nsField = fieldMapping.netSuiteFieldId;
            let lbField = fieldMapping.lbFieldId;
            let isLineItem = fieldMapping.isLineItem;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let lbValue = BSPLBUtils.getProp(objFields, lbField);

            log.debug("createCustomerRecord", 
                {
                    objMappingFields: JSON.stringify(fieldMapping),
                    lbValue: lbValue
                }
            );

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(fieldDataType == "String"){
                    if(!BSPLBUtils.isEmpty(lbValue)){
                        customerRec.setValue({ fieldId: nsField, value: lbValue });
                    }
                }                
            }
        }
        processCustomerAddress(customerRec, objMappingFields, objFields);

        newRecordId = customerRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().customer, objFields.customer.Id, BSPLBUtils.recTypes().customer)

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Add Addresses to Customer Record
     * @param {*} customerRec 
     * @param {*} objFields 
     */
    function processCustomerAddress(customerRec, objMappingFields, objFields){
        for (const fieldMapping of objMappingFields.lineFields) {
            let nsSublistId = fieldMapping.sublistId;
            let nsLineFieldId = fieldMapping.netSuiteFieldId;
            let lbLineFieldId = fieldMapping.lbFieldId;
            let lbValue = BSPLBUtils.getProp(objFields, lbLineFieldId);

            log.debug("processCustomerAddress", 
                {
                    objMappingFields: JSON.stringify(fieldMapping),
                    lbValue: lbValue
                }
            );

            customerRec.selectNewLine({
                sublistId: nsSublistId
            })
        
            let addressSubRecord = customerRec.getCurrentSublistSubrecord({
                sublistId: nsSublistId,
                fieldId: 'addressbookaddress'
            })

            if(!BSPLBUtils.isEmpty(lbValue)){
                addressSubRecord.setValue({
                    fieldId: nsLineFieldId,
                    value: lbValue
                })
            }                 
        }
        customerRec.commitLine({
            sublistId: 'addressbook'
        });
    }

    /**
     * Gets Customer Record or Creates it if it does not exist
     * @param {*} logicBlockUserAccount 
     * @returns 
     */
    function fetchCustomer(logicBlockUserAccount, objMappingFields){
        let functionName = "fetchCustomers";
        let customerRecordResult = {};
        try{    
            let internalId = BSPLBUtils.getRecordInternalID(logicBlockUserAccount.Id);
            if(internalId){
                customerRecordResult = {nsID: internalId, logicBlockID: logicBlockUserAccount.Id};
            }else{
                let objFields = {
                    customer: logicBlockUserAccount,
                    BillingAddress: logicBlockUserAccount.BillingAddress,
                    ShippingAddress: logicBlockUserAccount.ShippingAddress
                }
                let recordCreationResult = createCustomerRecord(objFields, objMappingFields);
                if(recordCreationResult && recordCreationResult.recordId){
                    internalId = recordCreationResult.recordId;
                    customerRecordResult = {nsID: internalId, logicBlockID: logicBlockUserAccount.Id};
                }   
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
        return customerRecordResult;
    }

    
    return {
		fetchVendors: fetchVendors,
        fetchCustomer: fetchCustomer
	};

});