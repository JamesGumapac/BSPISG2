/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/http', 'N/runtime', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/search', 'N/task', './Lib/bsp_isg_transmitions_util.js'],
    /**
     * @param{http} http
     * @param{runtime} runtime
     * @param{record} record
     * @param{redirect} redirect
     * @param{serverWidget} serverWidget
     * @param{search} search
     * @param{task} task
    */
    (http, runtime, record, redirect, serverWidget, search, task, BSPUtil) => {
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
                let objSuiteletScriptParams = getParameters();
                let objClientParams = scriptContext.request.parameters; 
                if (scriptContext.request.method === http.Method.GET) {
                    let params = {
                        txtSuiteletTitle : objSuiteletScriptParams.suitelet_title,
                        clientScript_id : objSuiteletScriptParams.script_client,
                        vendorSelected : objClientParams.custparam_vendorSelected,
                        errorMsg: objClientParams.custparam_error_msg
                    }
                    let form = displayForm(params);
                    scriptContext.response.writePage(form);
                } else if (scriptContext.request.method === http.Method.POST) {
                    let stItemsSelected = objClientParams.custpage_item_queue;
                    let itemsSelected = JSON.parse(stItemsSelected);
                    let vendorSelected = objClientParams.custpage_vendors;
                    
                    try{
                        let poRecID = createPO(vendorSelected, itemsSelected);
                        createCartonBuyRecords(poRecID, itemsSelected);
                        let objMRTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: "customscript_bsp_isg_mr_update_manual_so",
                            deploymentId: "customdeploy_bsp_isg_mr_update_manual_so",
                            params: {
                                custscript_bsp_mr_cb_po_rec_id: poRecID
                            }
                        });
                        let intTaskID = objMRTask.submit();
                        log.debug(functionName, `MR Task submitted with ID: ${intTaskID}`);

                        redirect.toRecord({
                            type: record.Type.PURCHASE_ORDER,
                            id: poRecID,
                            isEditMode: true
                        });
                    }catch(error){
                        log.error(functionName, "Error: " + JSON.stringify(error.message));
                        redirect.toSuitelet({
                            scriptId: 'customscript_bsp_isg_sl_create_manual_po',
                            deploymentId: 'customdeploy_bsp_isg_sl_create_manual_po',
                            returnExternalUrl: false,
                            parameters: {
                                custparam_error_msg: "An error occoured when trying to create the PO. Please try again."
                            }
                        });
                    }
                }
            }catch(error){
                log.error(functionName, {error: error.toString()});
            }
        }

        const displayForm = (params) => {
            let form = serverWidget.createForm({
                title: params.txtSuiteletTitle
            });
            form.clientScriptFileId = params.clientScript_id;

            let vendors = getVendors();
            form = createHeaderFields(form, params, vendors);   
            let items = getItems(params, vendors);
            form = createItemSublist(form, items);
            return form;
        }

        const createHeaderFields = (form, params, vendors) => {
            form.addFieldGroup({
                id : 'fieldgroup_vendor_info',
                label : 'Select the vendor to which the PO will be referenced to'
            });
            let vendorField = form.addField({
                id: 'custpage_vendors',
                type: serverWidget.FieldType.SELECT,
                label: 'Choose Vendor',
                container: 'fieldgroup_vendor_info'
            });
            vendorField = populateVendorField(vendorField, params, vendors);

            let itemsInQueueField = form.addField({
                id: 'custpage_item_queue',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Items in queue'
            });
            itemsInQueueField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            let showMsg = form.addField({
                id: 'custpage_show_msg',
                type: serverWidget.FieldType.TEXT,
                label: 'Show Msg'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            if (params.errorMsg) {
                showMsg.defaultValue = params.errorMsg;
            }

            form.addFieldGroup({
                id : 'fieldgroup_items_info',
                label : 'Item list'
            });
            form.addField({
                id: 'custpage_select_all',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select/Unselect all items from list',
                container: 'fieldgroup_items_info'
            });

            form.addSubmitButton({
                label: 'Create PO'
            });

            return form;
        }

        const getVendors = () => {
            let vendors = [];
            const vendorSearchObj = search.create({
                type: "vendor",
                filters:
                [
                   ["custentity_bsp_isg_trading_part_settings","noneof","@NONE@"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "entityid",
                      sort: search.Sort.ASC,
                      label: "Name"
                   })
                ]
            });
            vendorSearchObj.run().each(function(result){
                let id = result.id;
                let name = result.getValue("entityid");
                vendors.push({
                    id: id,
                    name: name
                })
                return true;
            });
            return vendors;
        }

        const populateVendorField = (vendorField, params, vendors) => {
            vendors.forEach(element => {
                let id = element.id;
                let name = element.name;
                if(params.vendorSelected == id){
                    vendorField.addSelectOption({
                        value: id,
                        text: name,
                        isSelected: true
                    });
                }else{
                    vendorField.addSelectOption({
                        value: id,
                        text: name,
                        isSelected: false
                    });
                }
                
            });
            return vendorField;
        }

        const createItemSublist = (form, items) => {
            let sublist = form.addSublist({
                id: 'custpage_items_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Items'
            });
            sublist.addField({
                id: 'custpage_item_selected',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select'
            });
            sublist.addField({
                id: 'custpage_item_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Item ID'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            sublist.addField({
                id: 'custpage_so_item_line_id',
                type: serverWidget.FieldType.TEXT,
                label: 'SO Item Unique Line ID'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            sublist.addField({
                id: 'custpage_item_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Item Name'
            });
            sublist.addField({
                id: 'custpage_item_desc',
                type: serverWidget.FieldType.TEXT,
                label: 'Item Description'
            });
            sublist.addField({
                id: 'custpage_item_qty',
                type: serverWidget.FieldType.INTEGER,
                label: 'Quantity'
            });
            sublist.addField({
                id: 'custpage_bo_item_qty',
                type: serverWidget.FieldType.INTEGER,
                label: 'Backorder Quantity'
            });
            sublist.addField({
                id: 'custpage_min_item_qty',
                type: serverWidget.FieldType.TEXT,
                label: 'Minimum Quantity'
            });
            sublist.addField({
                id: 'custpage_po_item_qty',
                type: serverWidget.FieldType.INTEGER,
                label: 'PO Quantity'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.ENTRY
            });
            sublist.addField({
                id: 'custpage_po_sales_orders',
                type: serverWidget.FieldType.TEXT,
                label: 'SalesOrders'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            pupulateItemSublist(sublist, items);

            return form;
        }

        const pupulateItemSublist = (sublist, items) => {
            if(items.length > 0){
                let lineCount = 0;
                items.forEach(element => {
                    let itemID = element.itemID;
                    let itemName = element.itemName;
                    let itemDescription = element.itemDesc;
                    let quantity = element.quantity;
                    let backOrderQuantity = element.backOrderQuantity;
                    let minQuantity = element.minQuantity;
                    let poQuantity = element.poQuantity;
                    let salesOrders = element.salesOrders;
                    sublist.setSublistValue({
                        id: "custpage_item_selected",
                        line: lineCount,
                        value: 'F'
                    });
                    sublist.setSublistValue({
                        id: "custpage_item_id",
                        line: lineCount,
                        value: itemID
                    });
                    sublist.setSublistValue({
                        id: "custpage_item_name",
                        line: lineCount,
                        value: itemName
                    });
                    sublist.setSublistValue({
                        id: "custpage_item_desc",
                        line: lineCount,
                        value: itemDescription
                    });
                    sublist.setSublistValue({
                        id: "custpage_item_qty",
                        line: lineCount,
                        value: quantity
                    });
                    sublist.setSublistValue({
                        id: "custpage_bo_item_qty",
                        line: lineCount,
                        value: backOrderQuantity
                    });
                    sublist.setSublistValue({
                        id: "custpage_min_item_qty",
                        line: lineCount,
                        value: minQuantity
                    });
                    sublist.setSublistValue({
                        id: "custpage_po_item_qty",
                        line: lineCount,
                        value: poQuantity
                    });
                    sublist.setSublistValue({
                        id: "custpage_po_sales_orders",
                        line: lineCount,
                        value: JSON.stringify(salesOrders)
                    });
                    lineCount++;
                });
            }
        }

        const getItems = (params, vendors) => {
            let itemList = [];
            let filters = [
                ["mainline","is","F"], 
                "AND", 
                ["type","anyof","SalesOrd"], 
                "AND",
                ["purchaseorder","anyof","@NONE@"], 
                "AND", 
                ["custcol_bsp_isg_exclude_auto_transm","anyof","2"],
                "AND", 
                ["custcol_bsp_isg_manual_po_id","isempty",""]
            ];
            
            const salesOrderSearchObj = search.create({
                type: "salesorder",
                filters: filters,
                columns:
                [
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "Internal ID"
                    }),
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "Item"
                    }),
                    search.createColumn({
                        name: "displayname",
                        join: "item",
                        summary: "GROUP",
                        label: "Display Name"
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
                    }),
                    search.createColumn({
                       name: "lineuniquekey",
                       summary: "GROUP",
                       label: "Line Unique Key"
                    })
                ]
            });
            let itemParams = [];
            let columns = salesOrderSearchObj.columns;
            salesOrderSearchObj.run().each(function(result){
                let salesOrderID = result.getValue(columns[0]);
                let itemID = result.getValue(columns[1]);
                let itemName = result.getText(columns[1]);
                let itemDescription = result.getValue(columns[2]);
                let quantity = parseInt(result.getValue(columns[3]));
                let backOrderQuantity = parseInt(result.getValue(columns[4]));
                let soLineUniqueID = parseInt(result.getValue(columns[5]));

                let itemIndex = getItemIndex(itemList, itemID);
                if(itemIndex >= 0){
                    itemList[itemIndex].quantity += quantity;
                    itemList[itemIndex].backOrderQuantity += backOrderQuantity;
                    itemList[itemIndex].poQuantity += backOrderQuantity;
                    itemList[itemIndex].salesOrders.push(
                        {
                            salesOrderID: salesOrderID, 
                            soLineUniqueID: soLineUniqueID,
                            lineQuantity: quantity,
                            lineBackOrderQty: backOrderQuantity
                        });
                }else{
                    itemParams.push(itemID);
                    itemList.push({
                        itemID: itemID,
                        itemName: itemName,
                        itemDesc: itemDescription,
                        quantity: quantity,
                        backOrderQuantity: backOrderQuantity,
                        minQuantity: "Not defined",
                        poQuantity: backOrderQuantity,
                        salesOrders: [
                            {
                                salesOrderID: salesOrderID, 
                                soLineUniqueID: soLineUniqueID,
                                lineQuantity: quantity,
                                lineBackOrderQty: backOrderQuantity
                            }
                        ]
                    });
                }         
                return true;
            });
            
            if(itemList.length > 0){
                const carton_buy_item_soSearchObj = search.create({
                    type: "customrecord_bsp_isg_carton_buy_item_so",
                    filters:
                    [
                       ["custrecord_bsp_isg_carton_buy_item","anyof",itemParams]
                    ],
                    columns:
                    [
                       search.createColumn({name: "custrecord_bsp_isg_item_line_unique_id", label: "Item line Unique ID"})
                    ]
                });

                let resultSearch = BSPUtil.searchAll(carton_buy_item_soSearchObj);
                resultSearch.forEach(element => {
                    let itemLineUniqueID = element.getValue("custrecord_bsp_isg_item_line_unique_id");
                    itemList = processItemsByUniqueID(itemList, itemLineUniqueID);
                });
                 
                if(itemParams.length > 0){
                    let vendorSelected = params.vendorSelected || vendors[0].id;
                    const itemSearchObj = search.create({
                        type: "item",
                        filters:
                        [
                           ["internalid","anyof",itemParams], 
                           "AND",
                           ["custrecord_bsp_isg_parent_item.custrecord_bsp_isg_item_supplier","anyof",vendorSelected],
                           "AND", 
                           ["custrecord_bsp_isg_parent_item.custrecord_bsp_isg_min_quantity","isnotempty",""]
                        ],
                        columns:
                        [
                           search.createColumn({
                              name: "custrecord_bsp_isg_min_quantity",
                              join: "CUSTRECORD_BSP_ISG_PARENT_ITEM",
                              label: "Minimum Quantity"
                           })
                        ]
                     });
        
                    itemSearchObj.run().each(function(result){
                        let itemID = result.id;
                        let itemMinQuantity = result.getValue({name: 'custrecord_bsp_isg_min_quantity', join: 'CUSTRECORD_BSP_ISG_PARENT_ITEM'});
                        let itemIndex = getItemIndex(itemList, itemID);
                        if(itemIndex >= 0){
                            itemList[itemIndex].minQuantity = itemMinQuantity;    
                            itemList[itemIndex].poQuantity = (itemList[itemIndex].poQuantity > itemMinQuantity ? itemList[itemIndex].poQuantity : itemMinQuantity);            
                        }
                        return true;
                    });
                }       
            }
            return itemList;
        }

        const getItemIndex = (items, itemID) => {
            for (let index = 0; index < items.length; index++) {
                const element = items[index];
                if(element.itemID == itemID){
                    return index;
                }
            }     
            return -1;
        }

        const processItemsByUniqueID = (items, itemLineUniqueID) =>{
            for (let index = 0; index < items.length; index++) {
                const element = items[index];
                for (let i = 0; i < element.salesOrders.length; i++) {
                    const so = element.salesOrders[i];
                    let lineQty = so.lineQuantity;
                    let lineBackorderQty = so.lineBackOrderQty;
                    if(so.soLineUniqueID == itemLineUniqueID){
                        element.quantity -= lineQty;
                        element.backOrderQuantity -= lineBackorderQty;
                        element.poQuantity -= lineBackorderQty;
                        element.salesOrders.splice(i, 1);
                    }
                }      
            }
            for (let index = 0; index < items.length; index++) {
                const element = items[index];   
                if(element.salesOrders.length == 0){
                    items.splice(index, 1);
                }  
            }  
            return items;   
        }

        const createPO = (vendorSelected, itemsSelected) => {
            let purchaseOrderRec = record.create({
                type: record.Type.PURCHASE_ORDER,
                isDynamic: true,
            });

            purchaseOrderRec.setValue({
                fieldId: "entity",
                value: parseInt(vendorSelected),
            });

            itemsSelected.forEach(element => {
                let itemID = element.itemID;
                let itemQty = element.poQty;
                purchaseOrderRec.setCurrentSublistValue(
                    { 
                        sublistId: "item", 
                        fieldId: "item", 
                        value: itemID
                    }
                );
                purchaseOrderRec.setCurrentSublistValue(
                    { 
                        sublistId: "item", 
                        fieldId: "quantity", 
                        value: itemQty
                    }
                );
                purchaseOrderRec.commitLine({
                    sublistId: "item",
                });
            });
            let poRecordId = purchaseOrderRec.save();
            return poRecordId;
        }

        const createCartonBuyRecords = (poRecID, itemsSelected) => {
            itemsSelected.forEach(element => {
                let salesOrders = JSON.parse(element.salesOrders);
                if(salesOrders.constructor === Array){
                    for (let index = 0; index < salesOrders.length; index++) {
                        let salesorderObj = salesOrders[index];
                        let salesorderID = salesorderObj.salesOrderID;
                        let selectedLineItemID = salesorderObj.soLineUniqueID;
                        createCartonBuyRecord(salesorderID, element.itemID, selectedLineItemID, poRecID, element.poQty);
                    }
                }else{
                    let salesorderObj = salesOrders;
                    let salesorderID = salesorderObj.salesOrderID;
                    let selectedLineItemID = salesorderObj.soLineUniqueID;
                    createCartonBuyRecord(salesorderID, element.itemID, selectedLineItemID, poRecID, element.poQty);
                }       
            });
            
        }

        const createCartonBuyRecord = (soID, itemID, lineItemID, poRecID, poQty) =>{
            let cartonBuyRecord = record.create({
                type: "customrecord_bsp_isg_carton_buy_item_so",
            });
    
            cartonBuyRecord.setValue({
                fieldId: "custrecord_bsp_isg_carton_buy_item",
                value: parseInt(itemID),
            });
            cartonBuyRecord.setValue({
                fieldId: "custrecord_bsp_isg_carton_buy_so",
                value: parseInt(soID),
            });
            cartonBuyRecord.setValue({
                fieldId: "custrecord_bsp_isg_item_line_unique_id",
                value: lineItemID,
            });
            cartonBuyRecord.setValue({
                fieldId: "custrecord_bsp_isg_carton_buy_qty",
                value: parseInt(poQty),
            });
            cartonBuyRecord.setValue({
                fieldId: "custrecord_bsp_isg_carton_buy_po",
                value: parseInt(poRecID),
            });
            cartonBuyRecord.save();
        }

        const getParameters = () => {
            let script = runtime.getCurrentScript();
            let objParams = {
                script_client: script.getParameter('custscript_bsp_isg_script_client'),
                suitelet_title: script.getParameter('custscript_bsp_isg_suitelet_title')
            }
            return objParams;
        }

        return {onRequest}

    });
