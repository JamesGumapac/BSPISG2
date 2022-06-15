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

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(fieldDataType == "String"){
                    vendorRec.setValue({ fieldId: nsField, value: lbValue });
                }                 
            }
        }

        newRecordId = vendorRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().vendor, objFields.vendor.Id["#text"], BSPLBUtils.recTypes().vendor)

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    function fetchVendors(settings){
        let functionName = "fetchVendors";
        let vendorRecordsResult = [];
        try{
            let recordType = BSPLBUtils.recTypes().vendor;
            let objMappingFields = BSPLBUtils.getMappingFields(recordType, false);
    
            let lbVendorsResult = LBCatalogAPI.getVendors(settings);
    
            lbVendorsResult.lbVendors.forEach(vendorElement => {
                let internalId = BSPLBUtils.getRecordInternalID(vendorElement.Id["#text"]);
                if(internalId){
                    vendorRecordsResult.push({nsID: internalId, logicBlockID: vendorElement.Id["#text"]})
                }else{
                    let objFields = {
                        vendor: vendorElement
                    }
                    let recordCreationResult = createVendorRecord(objFields, objMappingFields);
                    if(recordCreationResult && recordCreationResult.recordId){
                        internalId = recordCreationResult.recordId;
                        vendorRecordsResult.push({nsID: internalId, logicBlockID: vendorElement.Id["#text"]})
                    }   
                }
            });
        }catch(error){
            log.error(functionName, {error: error.message});
            let errorDetail = JSON.stringify({error: error.message, projectId:inboundQueueId})
            let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
            BSPLBUtils.createErrorLog(
                errorSource,
                error.message,
                errorDetail
            );
        }      
        return vendorRecordsResult;
    }

    return {
		fetchVendors: fetchVendors
	};

});