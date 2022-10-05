/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/ui/serverWidget', 'N/search', './Lib/xml_template_handler.js', './Lib/bsp_isg_edi_settings.js'],
    
    (runtime, serverWidget, search, BSP_XMLTemplateHandler, BSP_EDISettingsUtil) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let functionName = "onRequest";
            try{         
                if (scriptContext.request.method === 'GET') {
                    log.debug(functionName, 'GET');
                    let paramsObj = getParameters();
                    let objParameters = scriptContext.request.parameters;   
                    let ediCartonBuyFields = BSP_EDISettingsUtil.getCartonBuyFields(paramsObj.environment);
                    let vendorsData = getVendors();

                    let params = {
                        ediCartonBuyFields : ediCartonBuyFields,
                        selectedVendor : {
                            selectedVendorID: objParameters.custparam_selected_vendor,
                            selectedVendorName: objParameters.custparam_selected_vendor_name
                        },
                        vendorsData : vendorsData,
                        checkboxes : {
                            chkAll : objParameters.custparam_chk_all,
                            chkItemsReachedMinQty : objParameters.custparam_chk_items_reached_min_qty,
                            chkItemsCloseToMinQty : objParameters.custparam_chk_items_closeto_min_qty
                        }
                    }

                    let form = serverWidget.createForm({
                        title: "Items pending transmission"
                    });
                    form.clientScriptFileId = paramsObj.clientScript_id;

                    form = completeForm(form, params);

                    let data = getData(params);

                    form.addFieldGroup({
                        id : 'fieldgroup_item_list',
                        label : 'Data'
                    });

                    if(data.data.length > 0){
                        
                        let templateId = paramsObj.fileTemplate;
                        let xmlFileObj = BSP_XMLTemplateHandler.buildFileFromTemplate(templateId, data, null, null);
    
                        let htmlField = form.addField({
                            id: "custom_inline_html",
                            type: serverWidget.FieldType.INLINEHTML,
                            label: "Form",
                            container: 'fieldgroup_item_list'
                        });
    
                        htmlField.defaultValue = xmlFileObj.fileContent;
                    }else{
                        form.addField({
                            id: "custom_empty_list_txt",
                            type: serverWidget.FieldType.LABEL,
                            label: "No items to be displayed at the moment",
                            container: 'fieldgroup_item_list'
                        });
                    }               
                    scriptContext.response.writePage(form);
                }
            }catch (error) {
                log.error(functionName, {error: error.toString()});
            }
        }

        /**
         * It takes a form, an array of vendors, and a selected vendor, and adds a select field to the form
         * with the vendors as options
         * @param form - The form object that you're adding the field to.
         * @param vendorsData - This is the data that will be used to populate the select field.
         * @param selectedVendor - The vendor that was selected in the previous form.
         * @returns The form is being returned.
        */
        const completeForm = (form, params) => {
            let vendorsData = params.vendorsData;
            let selectedVendor = params.selectedVendor;

            form.addFieldGroup({
                id : 'fieldgroup_vendor_info',
                label : 'Show for Vendor'
            });

            let objVendorField = form.addField({
                id: 'custpage_trading_partner',
                label: 'Vendors',
                type: serverWidget.FieldType.SELECT,
                container: 'fieldgroup_vendor_info'
            });
            
            for (let index = 0; index < vendorsData.length; index++) {
                let element = vendorsData[index];
                if(index == 0 || (selectedVendor && element.id == selectedVendor.selectedVendorID)){
                    objVendorField.addSelectOption({
                        value: element.id,
                        text: element.name,
                        isSelected: true
                    });
                }else{
                    objVendorField.addSelectOption({
                        value: element.id,
                        text: element.name,
                        isSelected: false
                    });
                }           
            }

            form.addFieldGroup({
                id : 'fieldgroup_filter_info',
                label : 'Filter by'
            });
      
            let checkboxes = params.checkboxes;

            let fieldChkItemsReachedMinQty = form.addField({
                id: "custom_chk_reached_min_qty",
                type: serverWidget.FieldType.CHECKBOX,
                label: "Items reached Carton buy Min Quantity",
                container: 'fieldgroup_filter_info'
            });
            if(isChecked(checkboxes, "chkItemsReachedMinQty")){
                fieldChkItemsReachedMinQty.defaultValue = 'T';
            }

            let fieldChkItemsCloseToMinQty = form.addField({
                id: "custom_chk_close_min_qty",
                type: serverWidget.FieldType.CHECKBOX,
                label: "Items Close to Carton buy Min Quantity",
                container: 'fieldgroup_filter_info'
            });
            if(isChecked(checkboxes, "chkItemsCloseToMinQty")){
                fieldChkItemsCloseToMinQty.defaultValue = 'T';
            }

            return form;
        }

        /**
         * It gets the Item data to show in the Suitelet
         * @returns An object with a property of data that is an array of objects.
         */
        const getData = (params) => {
            let itemData = [];
            let resultItemsData = getItems(params);
            itemData = getSalesOrdersFromItems(resultItemsData);
            return {data:itemData, totalItems: itemData.length};
        }

        /**
         * It creates a search object that returns all sales orders that have a specific item and vendor
         * @returns An object with two properties: itemData and itemParams.
        */
        const getItems = (params) => {
            let selectedVendor = params.selectedVendor;
            let vendorsData = params.vendorsData;
            let minQuantityPercentage = params.ediCartonBuyFields.minQuantityPercentage;
            let checkboxes = params.checkboxes;

            let vendor = null;
            if(selectedVendor && selectedVendor.selectedVendorID){
                let vendorIndex = findVendorInListBy(vendorsData, selectedVendor.selectedVendorID, "id");
                vendor = {id: selectedVendor.selectedVendorID, name: selectedVendor.selectedVendorName, contractCodes: vendorsData[vendorIndex].contractCodes};
            }else{
                vendor = {id:  vendorsData[0].id, name:  vendorsData[0].name, contractCodes: vendorsData[0].contractCodes}
            }

            const salesOrderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                    ["type","anyof","SalesOrd"], 
                    "AND", 
                    ["mainline","is","F"], 
                    "AND", 
                    ["purchaseorder","anyof","@NONE@"], 
                    "AND", 
                    ["custcol_bsp_isg_exclude_auto_transm","anyof","1"],
                    "AND", 
                    ["formulanumeric: {quantity} - NVL({quantitycommitted}, 0)","greaterthan","0"]
                ],
                columns:
                [
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "Item"
                    }),
                    search.createColumn({
                        name: "quantity",
                        summary: "SUM",
                        label: "Quantity"
                    }),
                    search.createColumn({
                       name: "formulanumeric",
                       summary: "SUM",
                       formula: "{quantity} - NVL({quantitycommitted}, 0)",
                       label: "Formula (Numeric)"
                    })
                ]
            });
            let itemData = [];
            let columns = salesOrderSearchObj.columns;
            salesOrderSearchObj.run().each(function(result){
                let itemID = result.getValue(columns[0]);
                let itemRowID = "#"+itemID;
                let itemName = result.getText(columns[0]);
                let itemQuantity = result.getValue(columns[1]);
                let itemBackOrderQuantity = result.getValue(columns[2]);

                itemData.push({
                    itemRowID: itemRowID,
                    itemID: itemID,
                    itemName: itemName,
                    itemQuantity: itemQuantity,
                    itemBackOrderQuantity: itemBackOrderQuantity,
                    itemRegularCost: "Not defined",
                    itemCartonCost: "Not defined",
                    itemMinQuantity: "Not defined",
                    vendor: vendor.name,
                    rowColor: null,
                    salesOrderLines: []
                });
                return true;
            });

            if(itemData.length > 0) {

                const item_acct_dataSearchObj = search.create({
                    type: "customrecord_bsp_isg_item_acct_data",
                    filters:
                    [
                       ["custrecord_bsp_isg_parent_item","anyof", itemData.map(i => i.itemID)],
                       "AND", 
                       ["custrecord_bsp_isg_item_supplier","anyof",vendor.id]
                    ],
                    columns:
                    [
                       search.createColumn({name: "custrecord_bsp_isg_parent_item", label: "Item"}),
                       search.createColumn({name: "custrecord_bsp_isg_item_supplier", label: "Supplier"}),
                       search.createColumn({name: "custrecord_bsp_isg_item_contract_code", label: "Contract Code"}),
                       search.createColumn({name: "custrecord_bsp_isg_min_quantity", label: "Minimum Quantity"}),
                       search.createColumn({name: "custrecord_bsp_isg_item_cost", label: "Cost"})
                    ]
                });

                let itemsPricingData = [];

                item_acct_dataSearchObj.run().each(function(result){
                    let itemID = result.getValue({name: 'custrecord_bsp_isg_parent_item'});
                    let vendorID = result.getValue({name: 'custrecord_bsp_isg_item_supplier'});
                    let vendorName = result.getText({name: 'custrecord_bsp_isg_item_supplier'});
                    let contractCode = result.getText({name: 'custrecord_bsp_isg_item_contract_code'});
                    let minQuantity = result.getValue({name: 'custrecord_bsp_isg_min_quantity'});
                    let itemCost = result.getValue({name: 'custrecord_bsp_isg_item_cost'});
                    let itemIndex = findItemIndex(itemsPricingData, itemID);
                    if(itemIndex == -1){
                        if(isCartonBuy(vendor.contractCodes,contractCode)){
                            itemsPricingData.push({
                                itemID: itemID,
                                vendorID: vendorID,
                                vendorName: vendorName,
                                contractCodes: {
                                    cartonBuy: 
                                        {
                                            contractCode: contractCode, 
                                            minQuantity: minQuantity,
                                            itemCost: itemCost
                                        }
                                    ,
                                    regularAccount: {}
                                }
                            })
                        }else{
                            itemsPricingData.push({
                                itemID: itemID,
                                vendorID: vendorID,
                                vendorName: vendorName,
                                contractCodes: {
                                    cartonBuy: {},
                                    regularAccount: 
                                        {
                                            contractCode: contractCode, 
                                            minQuantity: minQuantity,
                                            itemCost: itemCost
                                        }
                                    
                                }
                            })
                        }
                    }else{
                        if(isCartonBuy(vendor.contractCodes,contractCode)){
                            if(!isEmpty(itemsPricingData[itemIndex].contractCodes.cartonBuy)){
                                if(isBetterPrice(itemsPricingData[itemIndex].contractCodes.cartonBuy.itemCost, itemCost)){
                                    itemsPricingData[itemIndex].contractCodes.cartonBuy = {
                                        contractCode: contractCode, 
                                        minQuantity: minQuantity,
                                        itemCost: itemCost
                                    };
                                }
                            }else{
                                itemsPricingData[itemIndex].contractCodes.cartonBuy = {
                                    contractCode: contractCode, 
                                    minQuantity: minQuantity,
                                    itemCost: itemCost
                                };
                            }
                        }else{ 
                            if(!isEmpty(itemsPricingData[itemIndex].contractCodes.regularAccount)){
                                if(isBetterPrice(itemsPricingData[itemIndex].contractCodes.regularAccount.itemCost, itemCost)){
                                    itemsPricingData[itemIndex].contractCodes.regularAccount = {
                                        contractCode: contractCode, 
                                        minQuantity: minQuantity,
                                        itemCost: itemCost
                                    };
                                }
                            }else{
                                itemsPricingData[itemIndex].contractCodes.regularAccount = {
                                    contractCode: contractCode, 
                                    minQuantity: minQuantity,
                                    itemCost: itemCost
                                };
                            }
                        }
                    }
                    return true;
                });

                itemsPricingData.forEach(item => {
                    let itemID = item.itemID;
                    let vendorName = item.vendorName;
                    let itemMinQuantity = item.contractCodes.cartonBuy.minQuantity || "Not Defined";
                    let itemCartonCost = item.contractCodes.cartonBuy.itemCost || "Not Defined";
                    let itemRegularCost = item.contractCodes.regularAccount.itemCost || "Not Defined";
                     
                    let itemIndex = findItemIndex(itemData, itemID);
                    if(itemIndex >= 0){
                        let itemMinQuantityPercent = ((itemData[itemIndex].itemBackOrderQuantity * 100) / itemMinQuantity);
                        let closeToMinQty = (itemMinQuantityPercent >= parseFloat(minQuantityPercentage) && itemMinQuantityPercent < 100);
                        let equalToMinQty = (parseInt(itemData[itemIndex].itemBackOrderQuantity) >= parseInt(itemMinQuantity));
                        let rowColor = (equalToMinQty ? "background-color:#b5e7a0" : (closeToMinQty ? "background-color:yellow" : null));
                        
                        if(!isChecked(checkboxes, "chkItemsReachedMinQty") && !isChecked(checkboxes, "chkItemsCloseToMinQty")){
                            itemData[itemIndex].itemMinQuantity = itemMinQuantity;
                            itemData[itemIndex].itemCartonCost = itemCartonCost;
                            itemData[itemIndex].itemRegularCost = itemRegularCost;
                            itemData[itemIndex].vendor = vendorName;
                            itemData[itemIndex].rowColor = rowColor;
                        }else if(isChecked(checkboxes, "chkItemsReachedMinQty") && isChecked(checkboxes, "chkItemsCloseToMinQty")){
                            if(equalToMinQty || closeToMinQty){
                                itemData[itemIndex].itemMinQuantity = itemMinQuantity;
                                itemData[itemIndex].itemCartonCost = itemCartonCost;
                                itemData[itemIndex].itemRegularCost = itemRegularCost;
                                itemData[itemIndex].vendor = vendorName;
                                itemData[itemIndex].rowColor = rowColor;
                            }else{
                                itemData.splice(itemIndex, 1)
                            }              
                        }else if(isChecked(checkboxes, "chkItemsReachedMinQty") && !isChecked(checkboxes, "chkItemsCloseToMinQty")){
                            if(equalToMinQty){
                                itemData[itemIndex].itemMinQuantity = itemMinQuantity;
                                itemData[itemIndex].itemCartonCost = itemCartonCost;
                                itemData[itemIndex].itemRegularCost = itemRegularCost;
                                itemData[itemIndex].vendor = vendorName;
                                itemData[itemIndex].rowColor = rowColor;
                            }else{
                                itemData.splice(itemIndex, 1)
                            }
                        }else if(!isChecked(checkboxes, "chkItemsReachedMinQty") && isChecked(checkboxes, "chkItemsCloseToMinQty")){
                            if(closeToMinQty){
                                itemData[itemIndex].itemMinQuantity = itemMinQuantity;
                                itemData[itemIndex].itemCartonCost = itemCartonCost;
                                itemData[itemIndex].itemRegularCost = itemRegularCost;
                                itemData[itemIndex].vendor = vendorName;
                                itemData[itemIndex].rowColor = rowColor;
                            }else{
                                itemData.splice(itemIndex, 1)
                            } 
                        }
                    }
                });
            }
            return itemData;
        }

        /**
         * This function takes the result of the search for items and returns an array of objects with the
         * sales order lines for each item
         * @param resultItemsData - This is the result of the getItemsFromSearch function.
         * @returns An array of objects.
        */
        const getSalesOrdersFromItems = (resultItemsData) => {
            let itemData = resultItemsData;
            if(itemData.length > 0){
                const salesOrderLinesSearchObj = search.create({
                    type: "salesorder",
                    filters:
                    [
                       ["type","anyof","SalesOrd"], 
                       "AND", 
                       ["mainline","is","F"], 
                       "AND", 
                       ["purchaseorder","anyof","@NONE@"], 
                       "AND", 
                       ["custcol_bsp_isg_exclude_auto_transm","anyof","1"], 
                       "AND",
                       ["formulanumeric: {quantity} - NVL({quantitycommitted}, 0)","greaterthan","0"],
                       "AND", 
                       ["item","anyof", itemData.map(i => i.itemID)]
                    ],
                    columns:
                    [
                        search.createColumn({name: "tranid", label: "Document Number"}),
                        search.createColumn({name: "entity", label: "Name"}),
                        search.createColumn({name: "custbody_bsp_isg_route_code", label: "Route Code"}),
                        search.createColumn({
                            name: "custrecord_bsp_lb_route_code_desc",
                            join: "CUSTBODY_BSP_ISG_ROUTE_CODE",
                            label: "Description"
                        }),
                        search.createColumn({name: "item", label: "Item"}),
                        search.createColumn({name: "quantity", label: "Quantity"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "{quantity} - NVL({quantitycommitted}, 0)",
                            label: "Formula (Numeric)"
                        }),
                        search.createColumn({
                           name: "lineuniquekey",
                           label: "Line Unique Key"
                        })
                    ]
                });
                let columns = salesOrderLinesSearchObj.columns;
                salesOrderLinesSearchObj.run().each(function(result){
                    let salesOrderID = result.id;
                    let salesOrderNumber = result.getValue("tranid");
                    let customer = result.getText("entity");
                    let routeCode = result.getText("custbody_bsp_isg_route_code");
                    let routeCodeDesc = result.getValue({name: "custrecord_bsp_lb_route_code_desc", join: "CUSTBODY_BSP_ISG_ROUTE_CODE"});
                    let itemID = result.getValue("item");
                    let itemLineQuantity = result.getValue("quantity");
                    let itemLineBackOrderQuantity = result.getValue(columns[6]);
                    let soLineUniqueID = parseInt(result.getValue(columns[7]));
                    let itemIndex = findItemIndex(itemData, itemID);
                    if(itemIndex >= 0){
                        itemData[itemIndex].salesOrderLines.push({
                            salesOrderID: salesOrderID,
                            salesOrderNumber: salesOrderNumber,
                            customer: customer,
                            routeCode: routeCode,
                            routeCodeDesc: routeCodeDesc,
                            itemLineQuantity: itemLineQuantity,
                            itemLineBackOrderQuantity: itemLineBackOrderQuantity,
                            rowValue:  salesOrderID + "|" + itemID + "|" + itemLineQuantity + "|" + itemData[itemIndex].itemMinQuantity,
                            chkID: salesOrderID + "|" + itemID + "|" + itemData[itemIndex].itemName + "|" + salesOrderNumber + "|" + soLineUniqueID
                        })
                    }
                    return true;
                });  
            }
     
            return itemData;
        }

        /**
         * Find the index of an item in an array of items, given the item's ID
         * @param itemData - The array of objects that you want to search through.
         * @param itemID - The ID of the item you want to find.
         * @returns The index of the itemID in the itemData array.
        */
        const findItemIndex = (itemData, itemID) => {
            for (let index = 0; index < itemData.length; index++) {
                const element = itemData[index];   
                if(element.itemID == itemID){
                    return index;
                }
            }
            return -1;
        }

        /**
         * It creates and runs a vendor search object, then loops through the results, pushing each result
         * into an array containing the vendor info
         * @returns An array of vendors.
        */
        const getVendors = () => {
            let vendors = [];


            const vendorSearchObj = search.create({
                type: "customrecord_bsp_isg_trading_partner",
                filters:
                [
                   ["isinactive","is","F"]
                ],
                columns:
                [
                   search.createColumn({name: "custrecord_bsp_isg_tp_vendor", label: "Vendor"})
                ]
             });

             vendorSearchObj.run().each(function(result){
                let tradingPartnerID = result.id;
                let id = result.getValue("custrecord_bsp_isg_tp_vendor");
                let name = result.getText("custrecord_bsp_isg_tp_vendor");
                vendors.push({
                    id: id,
                    name: name,
                    tradingPartnerID: tradingPartnerID,
                    contractCodes: {cartonBuy: [], regularAccount: []}
                })
                return true;
            });

            const accountNumberSearchObj = search.create({
                type: "customrecord_bsp_isg_account_number",
                filters:
                [
                   ["custrecord_bsp_isg_parent_trading_partn","anyof", vendors.map(v => v.tradingPartnerID)]
                ],
                columns:
                [
                   search.createColumn({
                      name: "name",
                      join: "CUSTRECORD_BSP_ISG_PARENT_ACCT_NUMBER",
                      label: "Name"
                   }),
                   search.createColumn({name: "custrecord_bsp_isg_carton_buy_acct", label: "Carton Buy"}),
                   search.createColumn({name: "custrecord_bsp_isg_parent_trading_partn", label: "Trading Partner"})
                ]
             });

             accountNumberSearchObj.run().each(function(result){
                let contractCodeName = result.getValue({name: 'name', join: 'CUSTRECORD_BSP_ISG_PARENT_ACCT_NUMBER'});
                let isCartonBuy = result.getValue({name: 'custrecord_bsp_isg_carton_buy_acct'});
                
                let tradingPartnerID = result.getValue({name: 'custrecord_bsp_isg_parent_trading_partn'});
                let vendorIndex = findVendorInListBy(vendors, tradingPartnerID, "tradingPartnerID");
                if(vendorIndex >= 0){
                    if(isCartonBuy){
                        vendors[vendorIndex].contractCodes.cartonBuy.push(contractCodeName);
                    }else{
                        vendors[vendorIndex].contractCodes.regularAccount.push(contractCodeName);
                    }
                }
                return true;
            });

            return vendors;
        }

        /**
         * It takes a list of vendors, an attribute value, and an attribute name, and returns the index of the
         * vendor in the list that has the given attribute value for the given attribute name.
         * 
         * If no vendor is found, it returns -1.
         * @param vendors - the array of objects that you want to search through
         * @param atributteValue - The value of the attribute you want to find.
         * @param atributteName - The name of the attribute you want to search for.
         * @returns The index of the vendor in the list.
        */
        const findVendorInListBy = (vendors, atributteValue, atributteName) => {
            for (let index = 0; index < vendors.length; index++) {
                const element = vendors[index];   
                if(element[atributteName] == atributteValue){
                    return index;
                }
            }
            return -1;
        }

        const isCartonBuy = (contractCodes, contractCode) => {
            for (let index = 0; index < contractCodes.cartonBuy.length; index++) {
                const element = contractCodes.cartonBuy[index];   
                if(element == contractCode){
                    return true;
                }
            }
            return false;
        }

        const isBetterPrice = (currentCost, itemCost) => {
            return parseFloat(itemCost) < parseFloat(currentCost);
        }

        const isChecked = (checkboxes, field) => {
            return checkboxes[field] == "true";
        }

        /**
         * Retieves Script parameters set up in the Deployment Record
         * @returns {Object} Script parameters
        */
         const getParameters = () => {
            let objParams = {};
            let environment = runtime.envType;
            let objScript = runtime.getCurrentScript();
            objParams = {
                fileTemplate : objScript.getParameter({name: "custscript_bsp_isg_carton_buy_template"}),
                clientScript_id : objScript.getParameter({name: "custscript_bsp_isg_carton_buy_cs"}),
                environment: environment
            }   
            return objParams;
        }

        /**
         * Check for Empty value
         * @param {*} value 
         * @returns 
        */
        function isEmpty(value) {
            return (
                value === "" ||
                value == null ||
                value == undefined ||
                value == "null" ||
                value == "undefined" ||
                (value.constructor === Array && value.length == 0) ||
                (value.constructor === Object &&
                    (function (v) {
                        for (let k in v) return false;
                        return true;
                    })(value))
            );
        }

        return {onRequest}

    });
