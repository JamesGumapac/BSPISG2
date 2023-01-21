/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
*/

define(['N/http', 'N/runtime', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/search', 'N/task', 'N/cache', './Lib/bsp_isg_edi_settings.js'],
    /**
     * @param{http} http
     * @param{runtime} runtime
     * @param{record} record
     * @param{redirect} redirect
     * @param{serverWidget} serverWidget
     * @param{search} search
     * @param{task} task
    */
    (http, runtime, record, redirect, serverWidget, search, task, cache, BSP_EDISettingsUtil) => {
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
                    
                    let ediSettings = BSP_EDISettingsUtil.getEDIsettings(objSuiteletScriptParams.environment);

                    try{
                        let listPOsCreatedObj = createPOs(vendorSelected, itemsSelected, ediSettings.transactionForm);
                        createCartonBuyRecords(listPOsCreatedObj.itemData);
                        
                        if(listPOsCreatedObj.listPOsCreated.length > 1){
                            redirect.toSavedSearchResult({
                                id: createPOSearchObj(listPOsCreatedObj.listPOsCreated)
                            });
                        }else{
                            redirect.toRecord({
                                type: record.Type.PURCHASE_ORDER,
                                id: listPOsCreatedObj.listPOsCreated[0],
                                isEditMode: true
                            });
                        }

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

        /**
         * It creates a form, adds a client script to it, creates header fields, and then creates a sublist of
         * items
         * @param params - 
         * @returns The form object is being returned.
        */
        const displayForm = (params) => {
            let form = serverWidget.createForm({
                title: params.txtSuiteletTitle
            });
            form.clientScriptFileId = params.clientScript_id;

            let vendors = getVendors();
            form = createHeaderFields(form, params, vendors);   
            if(vendors.length > 0){
                let items = getItems(params, vendors);
                form = createItemSublist(form, items, params, vendors);
            }
            return form;
        }

        /**
         * It creates the header fields for the form
         * @param form - The form object that we are going to add fields to.
         * @param params - This is an object that contains the following properties:
         * @param vendors - An array of vendor objects.
         * @returns The form object is being returned.
        */
        const createHeaderFields = (form, params, vendors) => {

            /**
             * Field Group Vendors
            */

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
                label: 'Show Msg',
                container: 'fieldgroup_vendor_info'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            if (params.errorMsg) {
                showMsg.defaultValue = params.errorMsg;
            }

            /**
             * Field Group Purchase Order(s) Information
            */

            form.addFieldGroup({
                id : 'fieldgroup_po_info',
                label : 'Purchase Order(s) Information'
            });

            form.addField({
                id: 'custpage_total_po_amount',
                type: serverWidget.FieldType.TEXT,
                label: 'Total',
                container: 'fieldgroup_po_info'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            }).defaultValue = `$${0.00}`;

            if(vendors.length > 0){
                let vendorSelected = null;
                if(params.vendorSelected){
                    let vendorIndex = findVendorInListBy(vendors, params.vendorSelected, "id");
                    vendorSelected = {id: params.vendorSelected, name: vendors[vendorIndex].name, tradingPartnerID: vendors[vendorIndex].tradingPartnerID, accountNumbers: vendors[vendorIndex].accountNumbers};
                }else{
                    vendorSelected = {id:  vendors[0].id, name:  vendors[0].name,  tradingPartnerID: vendors[0].tradingPartnerID, accountNumbers: vendors[0].accountNumbers}
                }
                let minAmountPO = getMinAmountCartonPO(vendorSelected.tradingPartnerID);
                
                let accountFieldIDs = [];
                vendorSelected.accountNumbers.forEach(account => {
                    form.addField({
                        id: 'custpage_total_acct_'+account.id,
                        type: serverWidget.FieldType.TEXT,
                        label: 'Total for Account: ' + account.name,
                        container: 'fieldgroup_po_info'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    }).defaultValue = `$${0.00}`;
                    accountFieldIDs.push({acctID: account.id, fieldID: `custpage_total_acct_${account.id}`});
                });
    
                form.addField({
                    id: 'custpage_min_total_po_amount',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Minimum Amount for Purchase Order',
                    container: 'fieldgroup_po_info'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                }).defaultValue = `$${minAmountPO}`;
    
                form.addField({
                    id: 'custpage_acct_field_ids',
                    type: serverWidget.FieldType.LONGTEXT,
                    label: 'Account field IDs',
                    container: 'fieldgroup_po_info'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                }).defaultValue = `${JSON.stringify(accountFieldIDs)}`;
            }

            /**
             * Field Group Item List
            */
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
                    accountNumbers: []
                })
                return true;
            });

            if(vendors.length > 0){
                const accountNumberSearchObj = search.create({
                    type: "customrecord_bsp_isg_account_number",
                    filters:
                    [
                       ["custrecord_bsp_isg_parent_trading_partn","anyof", vendors.map(v => v.tradingPartnerID)],
                       "AND", 
                       ["custrecord_bsp_isg_carton_buy_acct","is","T"]
                    ],
                    columns:
                    [
                       search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                       }), 
                       search.createColumn({name: "custrecord_bsp_isg_parent_trading_partn", label: "Trading Partner"})
                    ]
                 });
    
                 accountNumberSearchObj.run().each(function(result){
                    let accountID = result.id;
                    let accountName = result.getValue({name: 'name'});
                    let tradingPartnerID = result.getValue({name: 'custrecord_bsp_isg_parent_trading_partn'});
    
                    let vendorIndex = findVendorInListBy(vendors, tradingPartnerID, "tradingPartnerID");
                    if(vendorIndex >= 0){
                        let accountNumberIndex = findAccountInList(vendors[vendorIndex].accountNumbers, tradingPartnerID, accountID);
                        if(accountNumberIndex < 0){
                            vendors[vendorIndex].accountNumbers.push({id: accountID, name: accountName});
                        }             
                    }
                    return true;
                });
            }

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

        /**
         * It takes an array of account Numbers and an id and returns the index of the object in the array that has the
         * matching accountID.
         * @param accountNumbers - an array of objects that contain account numbers and their corresponding IDs
         * @param accountID - The account ID of the account you want to find.
         * @returns The index of the account number in the array.
         */
        const findAccountInList = (accountNumbers, accountID) => {
            for (let index = 0; index < accountNumbers.length; index++) {
                const element = accountNumbers[index];   
                if(element.id == accountID){
                    return index;
                }
            }
            return -1;
        }

        /**
         * It takes a select field, and a list of vendors, and populates the select field
         * with the list of vendors
         * @param vendorField - The field object that you want to populate.
         * @param params - This is the parameters that are passed to the client script.
         * @param vendors - This is the array of vendors that we got from the server.
         * @returns The vendorField is being returned.
        */
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

        /**
         * It creates a sublist on the form and populates it with the items that are passed in
         * @param form - The form object that we are adding the sublist to.
         * @param items - An array of objects that contain the item information.
         * @returns The form is being returned.
        */
        const createItemSublist = (form, items, params, vendors) => {
            let sublist = form.addSublist({
                id: 'custpage_items_sublist',
                type: serverWidget.SublistType.INLINEEDITOR,
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
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            sublist.addField({
                id: 'custpage_item_desc',
                type: serverWidget.FieldType.TEXT,
                label: 'Item Description'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            sublist.addField({
                id: 'custpage_item_qty',
                type: serverWidget.FieldType.INTEGER,
                label: 'Quantity'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            sublist.addField({
                id: 'custpage_bo_item_qty',
                type: serverWidget.FieldType.INTEGER,
                label: 'Backorder Quantity'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            let accountsField = sublist.addField({
                id: 'custpage_account_number',
                type: serverWidget.FieldType.SELECT,
                label: 'Account Number'
            });
            accountsField = populateAccountField(accountsField, params, vendors);

            sublist.addField({
                id: 'custpage_so_item_price',
                type: serverWidget.FieldType.TEXT,
                label: 'Carton Cost'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            sublist.addField({
                id: 'custpage_min_item_qty',
                type: serverWidget.FieldType.TEXT,
                label: 'Minimum Quantity'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            sublist.addField({
                id: 'custpage_po_item_qty',
                type: serverWidget.FieldType.TEXT,
                label: 'PO Quantity'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.ENTRY
            });
            sublist.addField({
                id: 'custpage_item_sum_cost',
                type: serverWidget.FieldType.TEXT,
                label: 'Amount'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });           
            sublist.addField({
                id: 'custpage_po_sales_orders',
                type: serverWidget.FieldType.TEXT,
                label: 'SalesOrders'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            sublist.addField({
                id: 'custpage_item_accounts',
                type: serverWidget.FieldType.TEXT,
                label: 'Item Account Data'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            pupulateItemSublist(sublist, items);

            return form;
        }

        /**
         * It takes a list of vendors, a list of accounts, and a vendor id, and populates the account field
         * with the accounts for the vendor.
         * 
         * The function is called from the following function:
         * @param accountsField - The field that will be populated with the account numbers.
         * @param params - This is the object that contains the values of the fields that are passed to the
         * client script.
         * @param vendors - this is the list of vendors that I'm getting from the server.
         * @returns The accountsField is being returned.
        */
        const populateAccountField = (accountsField, params, vendors) => {

            let vendorSelected = null;
            if(params.vendorSelected){
                let vendorIndex = findVendorInListBy(vendors, params.vendorSelected, "id");
                vendorSelected = {id: params.vendorSelected, name: vendors[vendorIndex].name, accountNumbers: vendors[vendorIndex].accountNumbers};
            }else{
                vendorSelected = {id:  vendors[0].id, name:  vendors[0].name, accountNumbers: vendors[0].accountNumbers}
            }

            vendors.forEach(element => {
                let vendorId = element.id;
                if(vendorSelected.id == vendorId){
                    let accounts = element.accountNumbers;
                    accounts.forEach(acct => {
                        let id = acct.id;
                        let name = acct.name;
                        accountsField.addSelectOption({
                            value: id,
                            text: name,
                            isSelected: false
                        });
                    });
                }                   
            });
            return accountsField;
        }

        /**
         * It takes a sublist and an array of items, and populates the sublist with the items
         * @param sublist - The sublist object
         * @param items - This is the array of items that you want to populate the sublist with.
        */
        const pupulateItemSublist = (sublist, items) => {

            if(items.length > 0){
                let suiteletCache = cache.getCache({
                    name: 'itemsCache',
                    scope: cache.Scope.PRIVATE
                });

                let lineCount = 0;
                items.forEach(element => {
                    let itemID = element.itemID;
                    let itemName = element.itemName;
                    let itemDescription = element.itemDesc;
                    let quantity = element.quantity;
                    let backOrderQuantity = element.backOrderQuantity;
                    let itemPrice = element.itemPrice;
                    let minQuantity = element.minQuantity;
                    let poQuantity = element.poQuantity;
                    let itemSumCost = element.itemSumCost;
                    let salesOrders = element.salesOrders;
                    let accounts = element.accounts;
                    let cartonAccount = element.cartonAccount;

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
                    if(cartonAccount){
                        sublist.setSublistValue({
                            id: "custpage_account_number",
                            line: lineCount,
                            value: cartonAccount.id
                        });
                    }
                    sublist.setSublistValue({
                        id: "custpage_item_sum_cost",
                        line: lineCount,
                        value:  `${itemSumCost != "Not defined" ? "$"+itemSumCost : itemSumCost}`
                    });
                    sublist.setSublistValue({
                        id: "custpage_so_item_price",
                        line: lineCount,
                        value: `${itemPrice != "Not defined" ? "$"+itemPrice : itemPrice}`
                    });
                    /*sublist.setSublistValue({
                        id: "custpage_po_sales_orders",
                        line: lineCount,
                        value: JSON.stringify(salesOrders)
                    });*/
                    suiteletCache.put({
                        key: itemID,
                        value: JSON.stringify(salesOrders)
                    });

                    if(accounts){
                        sublist.setSublistValue({
                            id: "custpage_item_accounts",
                            line: lineCount,
                            value: JSON.stringify(accounts)
                        });
                    }
                    lineCount++;
                });
            }
        }

        /**
         * This function will get all the items that are not in a purchase order and are set for manual transmission
         * @param params - 
         * @param vendors - This is an array of objects that contain the vendor ID and name.
         * @returns An array of objects.
        */
        const getItems = (params, vendors) => {
            let itemList = [];
            let filters = [
                ["mainline","is","F"], 
                "AND", 
                ["type","anyof","SalesOrd"], 
                "AND",
                ["purchaseorder","anyof","@NONE@"], 
                "AND", 
                ["custcol_bsp_isg_exclude_auto_transm","anyof","2"]
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

            let columns = salesOrderSearchObj.columns;
            salesOrderSearchObj.run().each(function(result){
                let salesOrderID = result.getValue(columns[0]);
                let itemID = result.getValue(columns[1]);
                let itemName = result.getText(columns[1]);
                let itemDescription = result.getValue(columns[2]);
                let quantity = parseInt(result.getValue(columns[3]));
                let backOrderQuantity = parseInt(result.getValue(columns[4]));
                let soLineUniqueID = parseInt(result.getValue(columns[5]));

                let itemIndex = findItemIndex(itemList, itemID);
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
                    itemList.push({
                        itemID: itemID,
                        itemName: itemName,
                        itemDesc: itemDescription,
                        quantity: quantity,
                        backOrderQuantity: backOrderQuantity,
                        minQuantity: "Not defined",
                        poQuantity: backOrderQuantity,
                        itemPrice: "Not defined",
                        itemSumCost: "Not defined",
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
                       ["custrecord_bsp_isg_carton_buy_item","anyof", itemList.map(i => i.itemID)]
                    ],
                    columns:
                    [
                       search.createColumn({name: "custrecord_bsp_isg_item_line_unique_id", label: "Item line Unique ID"})
                    ]
                });

                let resultSearch = searchAll(carton_buy_item_soSearchObj);
                resultSearch.forEach(element => {
                    let itemLineUniqueID = element.getValue("custrecord_bsp_isg_item_line_unique_id");
                    itemList = processItemsByUniqueID(itemList, itemLineUniqueID);
                });
                
                if(itemList.length > 0){
                    let vendorSelected = null;
                    if(params.vendorSelected){
                        let vendorIndex = findVendorInListBy(vendors, params.vendorSelected, "id");
                        vendorSelected = {id: params.vendorSelected, name: vendors[vendorIndex].name, accountNumbers: vendors[vendorIndex].accountNumbers};
                    }else{
                        vendorSelected = {id:  vendors[0].id, name:  vendors[0].name, accountNumbers: vendors[0].accountNumbers}
                    }

                    const item_acct_dataSearchObj = search.create({
                        type: "customrecord_bsp_isg_item_acct_data",
                        filters:
                        [
                           ["custrecord_bsp_isg_parent_item","anyof", itemList.map(i => i.itemID)],
                           "AND", 
                           ["custrecord_bsp_isg_item_supplier","anyof",vendorSelected.id]
                        ],
                        columns:
                        [
                           search.createColumn({name: "custrecord_bsp_isg_parent_item", label: "Item"}),
                           search.createColumn({name: "custrecord_bsp_isg_item_supplier", label: "Supplier"}),
                           search.createColumn({name: "custrecord_bsp_isg_account_number", label: "Account Number"}),
                           search.createColumn({name: "custrecord_bsp_isg_min_quantity", label: "Minimum Quantity"}),
                           search.createColumn({name: "custrecord_bsp_isg_item_cost", label: "Cost"})
                        ]
                    });
    
                    let itemsPricingData = [];
    
                    item_acct_dataSearchObj.run().each(function(result){
                        let itemID = result.getValue({name: 'custrecord_bsp_isg_parent_item'});
                        let vendorID = result.getValue({name: 'custrecord_bsp_isg_item_supplier'});
                        let vendorName = result.getText({name: 'custrecord_bsp_isg_item_supplier'});
                        let accountID = result.getValue({name: 'custrecord_bsp_isg_account_number'});
                        let accountName = result.getText({name: 'custrecord_bsp_isg_account_number'});
                        let minQuantity = result.getValue({name: 'custrecord_bsp_isg_min_quantity'});
                        let itemCost = result.getValue({name: 'custrecord_bsp_isg_item_cost'});

                        let cartonBuyAccountIndex = findAccountInList(vendorSelected.accountNumbers, accountID);
                        if(cartonBuyAccountIndex >= 0){
                            let itemIndex = findItemIndex(itemsPricingData, itemID);
                            if(itemIndex == -1){
                                itemsPricingData.push({
                                    itemID: itemID,
                                    vendorID: vendorID,
                                    vendorName: vendorName,
                                    accountNumberBestPrice: {   
                                        id: accountID,
                                        name: accountName,                       
                                        minQuantity: minQuantity,
                                        itemCost: itemCost                                        
                                    },
                                    accountNumbers: [{   
                                        id: accountID,
                                        name: accountName,                       
                                        minQuantity: minQuantity,
                                        itemCost: itemCost                                        
                                    }]
                                })        
                            }else{
                                if(isBetterPrice(itemsPricingData[itemIndex].accountNumberBestPrice.itemCost, itemCost)){
                                    itemsPricingData[itemIndex].accountNumberBestPrice = {
                                        id: accountID,
                                        name: accountName,    
                                        minQuantity: minQuantity,
                                        itemCost: itemCost
                                    };
                                } 
                                itemsPricingData[itemIndex].accountNumbers.push({
                                    id: accountID,
                                    name: accountName,    
                                    minQuantity: minQuantity,
                                    itemCost: itemCost
                                }); 
                            }
                        }
                        return true;
                    });

                    itemsPricingData.forEach(item => {
                        let itemID = item.itemID;
                        let accountID = item.accountNumberBestPrice.id;
                        let accountName = item.accountNumberBestPrice.name;
                        let cartonAccount = {id: accountID, name: accountName};
                        let itemMinQuantity = item.accountNumberBestPrice.minQuantity || "Not Defined";
                        let itemCartonCost = item.accountNumberBestPrice.itemCost || "Not Defined";
                        let accounts = item.accountNumbers;
                        let itemIndex = findItemIndex(itemList, itemID);

                        if(itemIndex >= 0){
                            itemList[itemIndex].accounts = accounts;
                            itemList[itemIndex].cartonAccount = cartonAccount;
                            itemList[itemIndex].minQuantity = itemMinQuantity;    
                            itemList[itemIndex].poQuantity = (itemList[itemIndex].poQuantity > (itemMinQuantity == "Not Defined" ? 0 : itemMinQuantity) ? itemList[itemIndex].poQuantity : itemMinQuantity);            
                            itemList[itemIndex].itemPrice = itemCartonCost; 
                            itemList[itemIndex].itemSumCost = isNaN((itemCartonCost * itemList[itemIndex].poQuantity).toFixed(2)) ? "Not Defined" : (itemCartonCost * itemList[itemIndex].poQuantity).toFixed(2); 
                        }
                    });
                }       
            }
            return itemList;
        }

        /**
         * It returns the index of the item in the array of items that has the itemID that matches the itemID
         * passed in as a parameter
         * @param items - The array of items to search through.
         * @param itemID - The ID of the item you want to remove.
         * @returns The index of the itemID in the items array.
        */
        const findItemIndex = (items, itemID) => {
            for (let index = 0; index < items.length; index++) {
                const element = items[index];
                if(element.itemID == itemID){
                    return index;
                }
            }     
            return -1;
        }

        /**
         * If the itemCost is less than the currentCost, return true, otherwise return false.
         * @param currentCost - The current cost of the item in the cart.
         * @param itemCost - The cost of the item you're currently looking at
         * @returns a boolean value.
        */
        const isBetterPrice = (currentCost, itemCost) => {
            return parseFloat(itemCost) < parseFloat(currentCost);
        }

        /**
         * It takes an array of items, and a unique ID of a sales order line, and then it removes the sales
         * order line from the item's salesOrders array if the Unique ID exists in a Carton Buy Custom rec, and then it removes the item from the items array if
         * it has no salesOrders
         * @param items - the array of items that you want to process
         * @param itemLineUniqueID - The unique ID of the line item that is being deleted.
         * @returns itemList
        */
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

        /**
         * This function creates a purchase order record and returns the internal ID of the newly created
         * record
         * @param vendorSelected - The vendor ID that was selected from the dropdown
         * @param itemsSelected - An array of objects that contain the item ID and the quantity to be ordered.
         * @returns The record ID of the newly created PO.
        */
        const createPOs = (vendorSelected, itemsSelected, transactionForm) => {
            let itemData = []
            let listPOsCreated = [];
            let itemsGroupedByAccount = groupBy(itemsSelected, (i) => i.accountSelected);

            for(let accountID in itemsGroupedByAccount) { 
                let data = itemsGroupedByAccount[accountID];
                
                let purchaseOrderRec = record.create({
                    type: record.Type.PURCHASE_ORDER,
                    isDynamic: true,
                });

                purchaseOrderRec.setValue({
                    fieldId: "customform",
                    value: transactionForm,
                });

                purchaseOrderRec.setValue({
                    fieldId: "custbody_bsp_isg_is_carton_buy",
                    value: true,
                });

                purchaseOrderRec.setValue({
                    fieldId: "entity",
                    value: parseInt(vendorSelected),
                });

                purchaseOrderRec.setValue({
                    fieldId: "custbody_bsp_isg_transmission_acct_num",
                    value: parseInt(accountID),
                });

                purchaseOrderRec.setValue({
                    fieldId: "custbody_bsp_isg_po_transm_status",
                    value: 1,
                });

                data.forEach(element => {   
                    let itemID = element.itemID;
                    let itemQty = element.poQty;
                    let itemPrice = element.itemPrice;

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
                    purchaseOrderRec.setCurrentSublistValue(
                        { 
                            sublistId: "item", 
                            fieldId: "rate", 
                            value: itemPrice
                        }
                    );
                    purchaseOrderRec.commitLine({
                        sublistId: "item",
                    });
                });
                let poRecordId = purchaseOrderRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                itemData.push({
                    data: data,
                    po: poRecordId
                });
                listPOsCreated.push(poRecordId)
            } 	
            return {
                itemData: itemData,
                listPOsCreated: listPOsCreated
            };
        }

        function groupBy(xs, f) {
            return xs.reduce((r, v, i, a, k = f(v)) => ((r[k] || (r[k] = [])).push(v), r), {});
        }

        /**
         * It takes in a PO record ID, and an array of items selected, and for each item selected, it creates a
         * carton buy record
         * @param poRecID - The internal ID of the Purchase Order record
         * @param itemsSelected - This is an array of objects that contain the itemID, poQty, and salesOrders.
        */
        const createCartonBuyRecords = (itemData) => {

            let suiteletCache = cache.getCache({
                name: 'itemsCache',
                scope: cache.Scope.PRIVATE
            });

            itemData.forEach(dataObj => {
                let data = dataObj.data;
                let po = dataObj.po;
                data.forEach(element => {
                    let strSalesOrders = suiteletCache.get({
                        key: element.itemID
                    });
                    let salesOrders = JSON.parse(strSalesOrders);
                    if(salesOrders.constructor === Array){
                        for (let index = 0; index < salesOrders.length; index++) {
                            let salesorderObj = salesOrders[index];
                            let salesorderID = salesorderObj.salesOrderID;
                            let selectedLineItemID = salesorderObj.soLineUniqueID;
                            createCartonBuyRecord(salesorderID, element.itemID, selectedLineItemID, po, element.poQty);
                        }
                    }else{
                        let salesorderObj = salesOrders;
                        let salesorderID = salesorderObj.salesOrderID;
                        let selectedLineItemID = salesorderObj.soLineUniqueID;
                        createCartonBuyRecord(salesorderID, element.itemID, selectedLineItemID, po, element.poQty);
                    }
                    suiteletCache.remove({
                        key: element.itemID
                    }); 
                });                         
            });          
        }

        /**
         * This function creates a record in the custom record "Carton Buy Item SO" and sets the values of the
         * fields "Carton Buy Item", "Carton Buy SO", "Item Line Unique ID", "Carton Buy Qty", and "Carton Buy
         * PO" to the values of the parameters "itemID", "soID", "lineItemID", "poQty", and "poRecID"
         * respectively
         * @param soID - The internal ID of the sales order
         * @param itemID - The internal ID of the item that is being purchased.
         * @param lineItemID - This is the unique ID of the line item on the sales order.
         * @param poRecID - The internal ID of the Purchase Order record
         * @param poQty - The quantity of the item that was purchased.
        */
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

        /**
         * It creates a search object for the Purchase Order record type, and filters the search by the
         * internal ID of the Purchase Order records that were created in the previous function.
         * @param listPOsCreated 
         * @returns A search object.
         */
        const createPOSearchObj = (listPOsCreated) => {

            let purchaseorderSearchObj = search.load({
                id: "customsearch_bsp_isg_cb_pos"
            });
            purchaseorderSearchObj.filters = [
                {
                    name: "type",
                    operator: "anyof",
                    values: "PurchOrd",
                    isor: false,
                    isnot: false,
                    leftparens: 0,
                    rightparens: 0
                },    
                {
                    name: "mainline",
                    operator: "is",
                    values: "T",
                    isor: false,
                    isnot: false,
                    leftparens: 0,
                    rightparens: 0
                },  
                {
                    name: "internalid",
                    operator: "anyof",
                    values: listPOsCreated,
                    isor: false,
                    isnot: false,
                    leftparens: 0,
                    rightparens: 0
                }
            ];

            return purchaseorderSearchObj.save();
        }

        /**
         * Get all results from a saved search
         * @param {*} objSavedSearch 
         * @returns 
        */
        function searchAll(objSavedSearch) {
            let title = "searchAll";
            let arrReturnSearchResults = [];
            try {
                let objResultset = objSavedSearch.run();
                let intSearchIndex = 0;
                let objResultSlice = null;
                let maxSearchReturn = 1000;

                let maxResults = 0;

                do {
                    let start = intSearchIndex;
                    let end = intSearchIndex + maxSearchReturn;
                    if (maxResults && maxResults <= end) {
                        end = maxResults;
                    }
                    objResultSlice = objResultset.getRange(start, end);

                    if (!objResultSlice) {
                        break;
                    }

                    arrReturnSearchResults = arrReturnSearchResults.concat(objResultSlice);
                    intSearchIndex = intSearchIndex + objResultSlice.length;

                    if (maxResults && maxResults == intSearchIndex) {
                        break;
                    }
                } while (objResultSlice.length >= maxSearchReturn);
            } catch (error) {
                log.error(title, error.toString());
            }
            return arrReturnSearchResults;
        }

        /**
         * It takes a trading partner ID and returns the minimum amount for a carton PO.
         * @param tradingPartnerID - The ID of the trading partner record.
         * @returns The value of the field custrecord_bsp_isg_min_amount_carton_po
        */
        function getMinAmountCartonPO(tradingPartnerID){
            let minAmount = 0.00;

            let tpFieldsObj = search.lookupFields({
                type: "customrecord_bsp_isg_trading_partner",
                id: tradingPartnerID,
                columns: 'custrecord_bsp_isg_min_amount_carton_po'
            });
            if(tpFieldsObj && tpFieldsObj.custrecord_bsp_isg_min_amount_carton_po){
                minAmount = tpFieldsObj.custrecord_bsp_isg_min_amount_carton_po;
            }
            return minAmount;
        }

        /**
         * It returns an object with the script parameters
         * @returns An object with two properties: script_client and suitelet_title
        */
        const getParameters = () => {
            let environment = runtime.envType;
            let script = runtime.getCurrentScript();

            let clientScriptFileId = search.create({
                type: "file",
                filters: [["name", "is", "bsp_isg_cs_create_manual_po_actions.js"]],
            }).run().getRange({ start: 0, end: 1 })[0].id;

            let objParams = {
                script_client: clientScriptFileId,
                suitelet_title: script.getParameter('custscript_bsp_isg_suitelet_title'),
                environment: environment
            }     
            return objParams;
        }

        return {onRequest}

    });
