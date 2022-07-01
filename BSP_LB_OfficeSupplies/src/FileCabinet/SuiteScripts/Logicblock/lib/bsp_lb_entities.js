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

            if (isLineItem == "F" || (isLineItem == false && nsField)) {    
                if(!BSPLBUtils.isEmpty(lbValue)){
                    if(fieldDataType == "String"){
                        vendorRec.setValue({ fieldId: nsField, value: lbValue });              
                    } else if(fieldDataType == "Integer"){               
                        vendorRec.setValue({ fieldId: nsField, value: parseInt(lbValue) });                       
                    } else if(fieldDataType == "Double"){               
                        vendorRec.setValue({ fieldId: nsField, value: parseFloat(lbValue) });                       
                    }   
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

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(!BSPLBUtils.isEmpty(lbValue)){
                    if(fieldDataType == "String"){
                        customerRec.setValue({ fieldId: nsField, value: lbValue });              
                    } else if(fieldDataType == "Integer"){               
                        customerRec.setValue({ fieldId: nsField, value: parseInt(lbValue) });                       
                    } else if(fieldDataType == "Double"){               
                        customerRec.setValue({ fieldId: nsField, value: parseFloat(lbValue) });                       
                    }   
                }        
            }
        }

        newRecordId = customerRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().customer, objFields.customer.Id, BSPLBUtils.recTypes().customer)

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Gets Customer Record or Creates it if it does not exist
     * @param {*} logicBlockUserAccount
     * @param {*} objMappingFields  
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
                    customer: logicBlockUserAccount
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