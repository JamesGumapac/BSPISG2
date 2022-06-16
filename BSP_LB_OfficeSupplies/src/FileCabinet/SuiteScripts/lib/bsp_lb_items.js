/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', './bsp_lb_utils.js', './bsp_lb_catalogservice_api.js'], function (record, BSPLBUtils, LBCatalogAPI) {

    /**
     * Create Item Record in NS
     * @param {*} objFields 
     * @param {*} objMappingFields 
     * @returns 
     */
     function createItemRecord(objFields, objMappingFields){
        let objResult = {};
        let status = BSPLBUtils.constants().successStatus;
        let newRecordId = "";

        log.debug("createItemRecord", 
            {
                objFields: JSON.stringify(objFields)
            }
        );

        let itemRec = record.create({
            type: record.Type.INVENTORY_ITEM,
            isDynamic: true,
        });

        for (const fieldMapping of objMappingFields.bodyFields) {
            let nsField = fieldMapping.netSuiteFieldId;
            let lbField = fieldMapping.lbFieldId;
            let isLineItem = fieldMapping.isLineItem;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let lbValue = BSPLBUtils.getProp(objFields, lbField);

            log.debug("createItemRecord", 
                {
                    objMappingFields: JSON.stringify(fieldMapping),
                    lbValue: lbValue
                }
            );

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(fieldDataType == "String"){
                    if(!BSPLBUtils.isEmpty(lbValue)){
                        itemRec.setValue({ fieldId: nsField, value: lbValue });
                    }
                }                
            }
        }

        newRecordId = itemRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().item, objFields.product.Id, "Product");

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Get Item Records or Create them if they do not exist
     * @param {*} lineItems
     * @param {*} objMappingFields  
     * @param {*} settings  
     * @returns 
     */
    function fetchItems(lineItems, objMappingFields, settings, loginData){
        let functionName = "fetchItems";
        let itemsRecordResult = [];
        try{   
            let productsSKU = getProductsSKUfromOrder(lineItems);
            let lbProductsResult = LBCatalogAPI.getItems(settings, loginData, productsSKU);
            if(lbProductsResult.lbProducts){
                if(lbProductsResult.lbProducts.length && lbProductsResult.lbProducts.length > 0){
                    lbProductsResult.lbProducts.forEach(productElement => {
                        let internalId = BSPLBUtils.getRecordInternalID(productElement.Id);
                        if(internalId){
                            itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id})
                        }else{
                            let objFields = {
                                product: productElement
                            }
                            let recordCreationResult = createItemRecord(objFields, objMappingFields);
                            if(recordCreationResult && recordCreationResult.recordId){
                                internalId = recordCreationResult.recordId;
                                itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id})
                            }
                        }
                    });
                }else{
                    let productElement = lbProductsResult.lbProducts;
                    let internalId = BSPLBUtils.getRecordInternalID(productElement.Id);
                    if(internalId){
                        itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id})
                    }else{
                        let objFields = {
                            product: productElement
                        }
                        let recordCreationResult = createItemRecord(objFields, objMappingFields);
                        if(recordCreationResult && recordCreationResult.recordId){
                            internalId = recordCreationResult.recordId;
                            itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id})
                        } 
                    }                
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
        return itemsRecordResult;
    }

    /**
     * get all Products SKU for Catalog API request
     * @param {*} lineItems 
     * @returns 
     */
    function getProductsSKUfromOrder(lineItems){
        let productsSKU = [];
        if(lineItems.constructor === Array){
            lineItems.forEach(lineItem => {
                let productSKU = lineItem.ProductSku;
                if(productSKU){
                    productsSKU.push(productSKU);
                }
            });
        }else{
            let lineItem = lineItems;
            let productSKU = lineItem.ProductSku;
            if(productSKU){
                productsSKU.push(productSKU);
            }
        }
        return productsSKU;
    }

    return {
		fetchItems: fetchItems
	};

});