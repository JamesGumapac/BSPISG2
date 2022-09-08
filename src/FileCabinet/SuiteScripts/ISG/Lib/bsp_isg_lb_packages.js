/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', 'N/search', './bsp_isg_lb_utils.js', './bsp_isg_lb_ordersservice_api.js'], function (record, search, BSPLBUtils, LBOrdersAPI) {

    /**
     * Create package in Logicblock
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} itemFulfillmentId 
     * @param {*} dateCreated 
     * @returns 
     */
    function createPackage(settings, loginData, itemFulfillmentId, dateCreated){
        let shipPackageData = getShipPackageData(itemFulfillmentId, dateCreated);
        let lbPackageResultObj = LBOrdersAPI.createPackage(settings, loginData, shipPackageData);
        return lbPackageResultObj;
    }

    /**
     * Ship package in Logicblock
     * @param {*} settings 
     * @param {*} lbPackageResultObj 
     * @returns 
     */
    function shipPackage(settings, lbPackageResultObj){
        return LBOrdersAPI.shipPackage(settings, lbPackageResultObj);
    }

    /**
     * Get ShipPackage data to make API request to Logicblock
     * @param {*} itemFulfillmentId 
     * @param {*} dateCreated 
     * @returns 
    */
    function getShipPackageData(itemFulfillmentId, dateCreated){
        var itemFulfillmentRecord = record.load({
            type: record.Type.ITEM_FULFILLMENT,
            id: itemFulfillmentId
        });

        let salesOrderID = itemFulfillmentRecord.getValue("createdfrom");
        let logicBlockOrderID = BSPLBUtils.getLogicblockID(salesOrderID);

        let logicBlockFields = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: salesOrderID,
            columns: ["custbody_bsp_isg_lb_shipping_prov_id", "custbody_bsp_isg_lb_shipping_method_id", "custbody_bsp_isg_lb_prov_service_code"]
        });
        let shippingProviderId = null;
        let shippingMethodId = null;
        let shippingProviderServiceCode = null;
        if(logicBlockFields){
            shippingProviderId = logicBlockFields.custbody_bsp_isg_lb_shipping_prov_id || null;
            shippingMethodId = logicBlockFields.custbody_bsp_isg_lb_shipping_method_id || null;
            shippingProviderServiceCode = logicBlockFields.custbody_bsp_isg_lb_prov_service_code || null;
        }

        let packageItems = [];
        let itemCount = itemFulfillmentRecord.getLineCount({ sublistId: 'item' });
        for (let i = 0; i < itemCount; i++) {
            let itemId = itemFulfillmentRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i });
            let quantity = itemFulfillmentRecord.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i });
            let lineItemId = itemFulfillmentRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_bsp_isg_lb_line_item_id', line: i });
            let logicBlockProductID = BSPLBUtils.getLogicblockID(itemId);
            packageItems.push({lineItemId: lineItemId, productId: logicBlockProductID, quantity: quantity});
        }

        dateCreated = new Date(dateCreated).toISOString();

        return {
            logicBlockOrderID: logicBlockOrderID, 
            packageItems: packageItems, 
            shippingProviderId: shippingProviderId, 
            shippingMethodId: shippingMethodId, 
            shippingProviderServiceCode: shippingProviderServiceCode,
            dateCreated: dateCreated
        }
    }

    return {
        createPackage: createPackage,
        shipPackage: shipPackage
	};

});