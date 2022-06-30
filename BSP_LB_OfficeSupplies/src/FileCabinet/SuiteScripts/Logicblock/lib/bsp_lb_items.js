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
            let isSetValue = fieldMapping.isSetValue;

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(!BSPLBUtils.isEmpty(lbValue)){
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
                            itemRec.setValue({ fieldId: nsField, value: resultValue });
                        }              
                    }else{
                        if(fieldDataType == "String"){               
                            itemRec.setValue({ fieldId: nsField, value: lbValue });                       
                        } else if(fieldDataType == "Integer"){               
                            itemRec.setValue({ fieldId: nsField, value: parseInt(lbValue) });                       
                        } else if(fieldDataType == "Double"){               
                            itemRec.setValue({ fieldId: nsField, value: parseFloat(lbValue) });                       
                        }       
                    }           
                }                            
            }
        }

        /**
         * Default quantity avaiable MAX
         */
        setDefaultQuantityAvaiableForItem(itemRec);

        newRecordId = itemRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, BSPLBUtils.recTypes().item, objFields.product.Id, "Product");

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Set default Quantity on hand
     * @param {*} itemRec 
     */
    function setDefaultQuantityAvaiableForItem(itemRec){
        let lineNumber = itemRec.findSublistLineWithValue({ sublistId: "locations", fieldId: "location", value: BSPLBUtils.constants().defaultInventoryLocation });
        itemRec.selectLine({
            sublistId: 'locations',
            line: lineNumber
        });
        itemRec.setCurrentSublistValue({ sublistId: "locations", fieldId: "quantityonhand", value: BSPLBUtils.constants().defaultQuantityOnHand });
        itemRec.commitLine({
            sublistId: "locations",
        });
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
                            itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id, productSKU: productElement.Sku})
                        }else{
                            let objFields = {
                                product: productElement
                            }
                            let recordCreationResult = createItemRecord(objFields, objMappingFields);
                            if(recordCreationResult && recordCreationResult.recordId){
                                internalId = recordCreationResult.recordId;
                                itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id, productSKU: productElement.Sku})
                            }
                        }
                    });
                }else{
                    let productElement = lbProductsResult.lbProducts;
                    let internalId = BSPLBUtils.getRecordInternalID(productElement.Id);
                    if(internalId){
                        itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id, productSKU: productElement.Sku})
                    }else{
                        let objFields = {
                            product: productElement
                        }
                        let recordCreationResult = createItemRecord(objFields, objMappingFields);
                        if(recordCreationResult && recordCreationResult.recordId){
                            internalId = recordCreationResult.recordId;
                            itemsRecordResult.push({nsID: internalId, logicBlockID: productElement.Id, productSKU: productElement.Sku})
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

    /**
     * Get Item's NS Record ID
     * @param {*} productSKU 
     * @param {*} itemRecordsResult 
     * @returns 
     */
    function getItemNetSuiteRecID(productSKU, itemRecordsResult){
        let itemRecID = null;
        itemRecordsResult.forEach(item => {
            if(item.productSKU == productSKU){
                itemRecID = item.nsID;
            }
        });
        return itemRecID;
    }

    return {
		fetchItems: fetchItems,
        getItemNetSuiteRecID: getItemNetSuiteRecID
	};

});