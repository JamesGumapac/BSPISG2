/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define([
  "N/record",
  "N/search",
  "N/render",
  "N/email",
  "./bsp_isg_lb_utils.js",
  "./bsp_isg_lb_items.js",
  "./bsp_isg_lb_ordersservice_api.js",
  "./bsp_isg_lb_entities.js",
], function (
  record,
  search,
  render,
  email,
  BSPLBUtils,
  BSPLBItems,
  LBOrdersAPI,
  BSPLBEntities
) {
  /**
   * Create Transaction Record in NS
   * @param {*} objFields
   * @param {*} objMappingFields
   * @param {*} customerRecordResult
   * @param {*} itemRecordsResult
   * @param {*} recType
   * @param {*} settings
   * @param {*} loginData
   * @returns
   */
  function createTransactionRecord(
    objFields,
    objMappingFields,
    customerRecordResult,
    itemRecordsResult,
    recType,
    settings,
    loginData
  ) {
    let objResult = {};
    let status = BSPLBUtils.constants().successStatus;
    let newRecordId = "";

    let transactionRecord = record.create({
      type: recType,
      isDynamic: true,
    });

    transactionRecord.setValue({
      fieldId: "customform",
      value: parseInt(objFields.logicBlockForm),
    });
    transactionRecord.setValue({
      fieldId: "entity",
      value: parseInt(customerRecordResult.nsID),
    });

    if (recType == record.Type.CASH_SALE) {
      let account = !BSPLBUtils.isEmpty(settings.custrecord_bsp_lb_account)
        ? settings.custrecord_bsp_lb_account[0].value
        : null;
      let location = !BSPLBUtils.isEmpty(
        settings.custrecord_bsp_lb_default_location_trans
      )
        ? settings.custrecord_bsp_lb_default_location_trans[0].value
        : null;

      if (account) {
        transactionRecord.setValue({ fieldId: "undepfunds", value: "F" });
        transactionRecord.setValue({ fieldId: "account", value: account });
      } else {
        transactionRecord.setValue({ fieldId: "undepfunds", value: "T" });
      }

      if (location) {
        transactionRecord.setValue({ fieldId: "location", value: location });
      }
    }

    let objCustomerFields = BSPLBEntities.getFieldsFromCustomer(
      customerRecordResult.nsID
    );

    let routeCode = objCustomerFields.addressSubRecord[0].routeCode;
    let accountNumber = objCustomerFields.addressSubRecord[0].accountNumber;
    let aopdVendor = objCustomerFields.addressSubRecord[0].aopdVendor;
    let flagged = objCustomerFields.overrideSchedule;

    if (BSPLBUtils.isEmpty(routeCode)) {
      routeCode = settings.custrecord_bsp_lb_default_route_code[0].value;
    }
    if (routeCode) {
      transactionRecord.setValue({
        fieldId: "custbody_bsp_isg_route_code",
        value: routeCode,
      });
    }

    if (aopdVendor) {
      transactionRecord.setValue({
        fieldId: "custbody_bsp_isg_aopd",
        value: true,
      });
    }
    let aopdChecker = aopdVendor
      ? transactionRecord.getValue({ fieldId: "custbody_bsp_isg_aopd" })
      : "";

    if (accountNumber) {
      transactionRecord.setValue({
        fieldId: "custbody_bsp_isg_cust_account_number",
        value: accountNumber,
      });
    }

    if (!BSPLBUtils.isEmpty(objFields.order.CustomerPurchaseOrderNumber)) {
      transactionRecord.setValue({
        fieldId: "custbody_bsp_isg_lb_payment_method",
        value: BSPLBUtils.constants().purchaseOrder,
      });
    } else {
      let paymentMethod = getOrderPaymentMethod(
        settings,
        loginData,
        objFields.order.Id
      );
      if (paymentMethod) {
        transactionRecord.setValue({
          fieldId: "custbody_bsp_isg_lb_payment_method",
          value: paymentMethod,
        });
      }
    }

    for (const fieldMapping of objMappingFields.bodyFields) {
      let nsField = fieldMapping.netSuiteFieldId;
      let nsFieldName = fieldMapping.netSuiteFieldName;
      let lbField = fieldMapping.lbFieldId;
      let isLineItem = fieldMapping.isLineItem;
      let fieldDataType = fieldMapping.lbFieldDataType;
      let defaultValue = fieldMapping.defaultValue;
      let lbValue = BSPLBUtils.getProp(objFields, lbField);

      if (isLineItem == "F" || (isLineItem == false && nsField)) {
        if (
          nsFieldName == BSPLBUtils.recTypes().salesOrder ||
          nsFieldName == BSPLBUtils.recTypes().cashSale
        ) {
          if (!BSPLBUtils.isEmpty(lbValue)) {
            if (fieldDataType == "String") {
              transactionRecord.setValue({ fieldId: nsField, value: lbValue });
            } else if (fieldDataType == "Date") {
              let ddate = lbValue;
              ddate = BSPLBUtils.convertResponseDateToNSDate(ddate);
              transactionRecord.setValue({ fieldId: nsField, value: ddate });
            } else if (fieldDataType == "Integer") {
              transactionRecord.setValue({
                fieldId: nsField,
                value: parseInt(lbValue),
              });
            } else if (fieldDataType == "Double") {
              transactionRecord.setValue({
                fieldId: nsField,
                value: parseFloat(lbValue),
              });
            }
          } else {
            if (!BSPLBUtils.isEmpty(defaultValue)) {
              transactionRecord.setValue({
                fieldId: nsField,
                value: defaultValue,
              });
            }
          }
        } else {
          let addressSubRecord = null;
          if (nsFieldName == BSPLBUtils.recTypes().shippingAddress) {
            addressSubRecord = transactionRecord.getSubrecord({
              fieldId: "shippingaddress",
            });
          } else {
            addressSubRecord = transactionRecord.getSubrecord({
              fieldId: "billingaddress",
            });
          }
          if (addressSubRecord) {
            if (!BSPLBUtils.isEmpty(lbValue)) {
              addressSubRecord.setValue({
                fieldId: nsField,
                value: lbValue,
              });
            } else {
              if (!BSPLBUtils.isEmpty(defaultValue)) {
                addressSubRecord.setValue({
                  fieldId: nsField,
                  value: defaultValue,
                });
              }
            }
          }
        }
      }
    }

    /*--- Shipping method translation  ---*/
    let shippingMethod;
    const isEmpty = Object.keys(objFields.order.ShippingMethodId).length === 0;
    if(isEmpty != true){
      log.debug('shipping method ID IF', objFields.order.ShippingMethodId);
    shippingMethod = searchShippingItem(objFields.order.ShippingMethodId);
    transactionRecord.setValue({ fieldId: "shipcarrier", value: "nonups" });
    transactionRecord.setValue({
      fieldId: "shipmethod",
      value: shippingMethod[0].internalid,
    });
    }
    /*--- Tax Calculations   ---*/
    let taxCalculation;
    if (settings.custrecord_bsp_lb_avatax == false) {
      if (objFields.order.TaxTotal) {
        taxable = true;
        transactionRecord.setValue({ fieldId: "istaxable", value: true });
        transactionRecord.setValue({
          fieldId: "taxitem",
          value: settings.custrecord_bsp_isg_taxable[0].value,
        });
        taxCalculation =
          (objFields.order.TaxTotal * 100) / objFields.order.SubTotal;
        transactionRecord.setValue({
          fieldId: "taxrate",
          value: taxCalculation,
        });
      } else {
        taxable = false;
        transactionRecord.setValue({ fieldId: "istaxable", value: false });
        transactionRecord.setValue({
          fieldId: "taxitem",
          value: settings.custrecord_bsp_isg_taxable[0].value,
        });
      }
    }
    /*--- Delivery zone checker   ---*/
    let delZone = searchDeliveryZone(objFields.order);
    let shipmentType =
      delZone != ""
        ? BSPLBUtils.SHIPMENT_TYPE.wrapAndLabel
        : BSPLBUtils.SHIPMENT_TYPE.dropship;

    if (shipmentType === BSPLBUtils.SHIPMENT_TYPE.wrapAndLabel) {
      transactionRecord.setValue({
        fieldId: "custbody_bsp_isg_route_code",
        value: delZone[0].routeCode,
      });
      transactionRecord.setValue({
        fieldId: "location",
        value: delZone[0].location,
      });

    let shipDate = transactionRecord.getValue({fieldId: 'shipdate'});

    loop : for(let i=0; i<20; i++){

          if(BSPLBUtils.getHoliday(transactionRecord.getValue({fieldId: 'shipdate'})) != ''){
            log.debug('before shipdatecalculation');
          shipDateCalculation(delZone, transactionRecord);
          log.debug('after shipdatecalculation');
          }
          else{
            transactionRecord.setValue({fieldId: 'shipdate', value:(transactionRecord.getValue({fieldId: 'shipdate'}))});   
            break loop;            
          }
      }
    }
    let shippingDate = transactionRecord.getValue({fieldId: 'shipdate'});
    if(flagged == true){    
        if(shippingDate.getDay() == 5){
          shippingDate.setDate(shippingDate.getDate() + 3); 
        }
        else {
          shippingDate.setDate(shippingDate.getDate() + 1);
        }
        transactionRecord.setValue({fieldId:'shipdate', value: shippingDate});
    }
    if (shipmentType === BSPLBUtils.SHIPMENT_TYPE.dropship) {
      let checkShipAddr = BSPLBEntities.checkShippingAddress(
        customerRecordResult.nsID,
        objFields.order
      );
    }

    processTransactionLines(
      transactionRecord,
      objFields.order,
      objMappingFields,
      itemRecordsResult,
      shipmentType,
      taxable,
      aopdChecker,
      settings
    );

    /**
     * Default values
     */
    newRecordId = transactionRecord.save();
    BSPLBUtils.createMappingKeyRecord(
      newRecordId,
      recType,
      objFields.order.Id,
      "Order"
    );
   
    /*--- Create Item Fulfillment for non-backorder Items   ---*/
    try{
      let itemSOCount = transactionRecord.getLineCount({
        sublistId: 'item' 
      });

      let newItemF;
      let backordered;
      let backorderedIF;
      let itemFulfillmentRec;
      let backorderCount = 0;

      for(i=0; i<itemSOCount; i++){
        backordered = transactionRecord.getSublistValue({sublistId: 'item', fieldId: 'backordered', line: i});
        if(backordered>0){
          backorderCount++;
        }      
      }
        
      if(itemSOCount > backorderCount){
          itemFulfillmentRec = record.transform({
            fromType: record.Type.SALES_ORDER,
            fromId: parseInt(newRecordId),
            toType: record.Type.ITEM_FULFILLMENT,
          }); 
        
          let itemIFCount = itemFulfillmentRec.getLineCount({
              sublistId: 'item' 
          });
          for(i=0; i<itemIFCount; i++){
            backorderedIF = transactionRecord.getSublistValue({sublistId: 'item', fieldId: 'backordered', line: i});
            if(backorderedIF>0){
              itemFulfillmentRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'itemreceive',
                line: i,
                value: false
              });
            }
          }
      
          newItemF = itemFulfillmentRec.save();
      }

    }catch(error){
      log.error("Error creating Item fulfillment record: " + JSON.stringify(error.message));
      return newRecordId;
    } 

    if (aopdVendor) {
      let purchaseOrderRec = record.create({
        type: record.Type.PURCHASE_ORDER,
        isDynamic: true,
        defaultValues: {
          soid: newRecordId,
          entity: aopdVendor,
          dropship: "T",
          custid: objCustomerFields.accountNumber
            ? objCustomerFields.accountNumber
            : "",
        },
      });
      let recordId = purchaseOrderRec.save({
        enableSourcing: false,
        ignoreMandatoryFields: false,
      });
      log.debug("PO created with ID: ", recordId);
      sendPOEmail(recordId, aopdVendor);
    }

    objResult = {
      status: status,
      recordId: newRecordId,
    };

    return objResult;
  }

  /**
   * Process lines of Sales Order
   * @param {*} transactionRecord
   * @param {*} order
   * @param {*} objMappingFields
   * @param {*} itemRecordsResult
   */
  function processTransactionLines(
    transactionRecord,
    order,
    objMappingFields,
    itemRecordsResult,
    shipmentType,
    taxable,
    aopdChecker,
    settings
  ) {
    let lineItems = [];
    if (
      order.LineItems.LineItem.length &&
      order.LineItems.LineItem.length > 0
    ) {
      lineItems = order.LineItems.LineItem;
    } else {
      lineItems.push(order.LineItems.LineItem);
    }

    let strSublistID = "item";
    lineItems.forEach((itemDetail) => {
      let productSKU = itemDetail.ProductSku;
      if (productSKU) {
        let itemRecId = BSPLBItems.getItemNetSuiteRecID(
          productSKU,
          itemRecordsResult
        );
        if (itemRecId) {
          transactionRecord.setCurrentSublistValue({
            sublistId: strSublistID,
            fieldId: "item",
            value: itemRecId,
          });
          transactionRecord.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_bsp_order_shipment_type",
            value: shipmentType,
          });

          if (taxable == true) {
            transactionRecord.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "istaxable",
              value: true,
            });
          } else {
            transactionRecord.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "istaxable",
              value: "F",
            });
          }

          /*--- Exclude Carton Buy Eligible Items   ---*/
          let excludeCartonBuyEligibleItems = settings.custrecord_bsp_isg_exclude_cb_items;
          let minQtyRequired = 0
          if(excludeCartonBuyEligibleItems == true){
            minQtyRequired = (!isNaN(parseInt(settings.custrecord_bsp_isg_min_qty_required))) ? parseInt(settings.custrecord_bsp_isg_min_qty_required) : 0;             
          }

          for (const fieldMapping of objMappingFields.lineFields) {
            let nsSublistId = fieldMapping.sublistId;
            let nsLineFieldId = fieldMapping.netSuiteFieldId;
            let lbLineFieldId = fieldMapping.lbFieldId;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let defaultValue = fieldMapping.defaultValue;
            let lbValue = BSPLBUtils.getProp(itemDetail, lbLineFieldId);
            let isSetValue = fieldMapping.isSetValue;

            if (nsSublistId == strSublistID) {
              if (!BSPLBUtils.isEmpty(lbValue)) {
                transactionRecord.selectNewLine({ sublistId: nsSublistId });
                if (isSetValue) {
                  let searchFilter = fieldMapping.lbFieldSearchFilter;
                  let searchRecord = fieldMapping.lbFieldSearchRecord;
                  let searchColumn = fieldMapping.lbFieldSearchColumn;
                  let searchOperator = fieldMapping.lbFieldSearchOperator;
                  let resultValue = BSPLBUtils.searchRecordToGetInternalId(
                    lbValue,
                    searchFilter,
                    searchRecord,
                    searchColumn,
                    searchOperator
                  );
                  if (!BSPLBUtils.isEmpty(resultValue)) {
                    transactionRecord.setCurrentSublistValue({
                      sublistId: nsSublistId,
                      fieldId: nsLineFieldId,
                      value: resultValue,
                    });
                  }
                } else {
                  if (fieldDataType == "String") {
                    transactionRecord.setCurrentSublistValue({
                      sublistId: nsSublistId,
                      fieldId: nsLineFieldId,
                      value: lbValue,
                    });
                  } else if (fieldDataType == "Integer") {
                    transactionRecord.setCurrentSublistValue({
                      sublistId: nsSublistId,
                      fieldId: nsLineFieldId,
                      value: parseInt(lbValue),
                    });
                  } else if (fieldDataType == "Double") {
                    transactionRecord.setCurrentSublistValue({
                      sublistId: nsSublistId,
                      fieldId: nsLineFieldId,
                      value: parseFloat(lbValue),
                    });
                  }
                }
              } else if (!BSPLBUtils.isEmpty(defaultValue)) {
                transactionRecord.setCurrentSublistValue({
                  sublistId: nsSublistId,
                  fieldId: nsLineFieldId,
                  value: defaultValue,
                });
              }
            }
          }

          if(excludeCartonBuyEligibleItems == true){
            let qty = transactionRecord.getCurrentSublistValue({sublistId: 'item', fieldId: 'quantity'});
            let qtyOnHand = transactionRecord.getCurrentSublistValue({sublistId: 'item', fieldId: 'quantityavailable'});
            let backorderedQty = (qtyOnHand > qty) ? 0 : Math.abs(qtyOnHand - qty);
            if(backorderedQty > 0 && backorderedQty >= minQtyRequired){
              transactionRecord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_bsp_isg_exclude_auto_transm',
                value: BSPLBUtils.constants().manualTransmission
              });
            }
          }
          
          let excludeItemFromTransmission = BSPLBItems.getItemField(
            itemRecId,
            "custitem_bsp_isg_excl_from_auto_transm"
          );
          if (excludeItemFromTransmission || aopdChecker) {
            transactionRecord.setCurrentSublistValue({
              sublistId: strSublistID,
              fieldId: "custcol_bsp_isg_exclude_auto_transm",
              value: BSPLBUtils.constants().excludeFromTransmission,
            });
          }

          transactionRecord.commitLine({
            sublistId: strSublistID,
          });
        }
      }
    });
  }

  /**
   * Create Transaction Record in NS or update it if it already exists
   * @param {*} order
   * @param {*} objMappingFields
   * @param {*} customerRecordResult
   * @param {*} itemRecordsResult
   * @param {*} settings
   * @param {*} loginData
   * @param {*} recType
   * @returns
   */
  function fetchTransaction(
    order,
    objMappingFields,
    customerRecordResult,
    itemRecordsResult,
    settings,
    loginData,
    recType
  ) {
    let functionName = "fetchTransaction";
    let transactionRecordResult = {};
    let transactionUpdated = false;
    try {
      let transactionRecID;
      if (!BSPLBUtils.getRecordInternalID(order.Id)) {
        transactionRecID = "";
      }
      // let transactionRecID = BSPLBUtils.getRecordInternalID(order.Id);
      if (transactionRecID) {
        transactionUpdated = true;
        try {
          BSPLBUtils.deleteMappedKey(order.Id);
          BSPLBUtils.deleteTransaction(recType, transactionRecID);
        } catch (error) {
          log.error(functionName, { error: error.message });
          let errorDetail = JSON.stringify({ error: error.message });
          let errorSource =
            "BSP | LB | MR | Create NS Records - " + functionName;
          BSPLBUtils.createErrorLog(errorSource, error.message, errorDetail);
        }
      }

      let objFields = {
        order: order,
        ShippingAddress: order.ShippingAddress,
        BillingAddress: order.BillingAddress,
        customerRecordResult: customerRecordResult,
        itemRecordsResult: itemRecordsResult,
        logicBlockForm:
          recType == record.Type.CASH_SALE
            ? settings.custrecord_bsp_lb_cash_sale_form[0].value
            : settings.custrecord_bsp_lb_sales_order_form[0].value,
      };
      let recordCreationResult = createTransactionRecord(
        objFields,
        objMappingFields,
        customerRecordResult,
        itemRecordsResult,
        recType,
        settings,
        loginData
      );
      if (recordCreationResult && recordCreationResult.recordId) {
        internalId = recordCreationResult.recordId;
        transactionRecordResult = {
          nsID: internalId,
          logicBlockID: order.Id,
          transactionUpdated: transactionUpdated,
        };
      }
    } catch (error) {
      log.error(functionName, { error: error.message });
      let errorDetail = JSON.stringify({ error: error.message });
      let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
      BSPLBUtils.createErrorLog(errorSource, error.message, errorDetail);
    }
    return transactionRecordResult;
  }

  /**
   * Returns true if Logicblock Order is already paid
   * @param {*} logicBlockOrder
   * @returns
   */
  function orderPaid(logicBlockOrder) {
    let paymentStatus = logicBlockOrder.PaymentStatus;
    return paymentStatus == BSPLBUtils.constants().statusPaid;
  }

  /**
   * Returns the Payment Method selected for the Logicblock Order
   * @param {*} settings
   * @param {*} loginData
   * @param {*} logicBlockOrderID
   * @returns
   */
  function getOrderPaymentMethod(settings, loginData, logicBlockOrderID) {
    let orderPaymentMethod = null;
    let paymentsResult = LBOrdersAPI.getOrderPayments(
      settings,
      loginData,
      logicBlockOrderID
    );
    if (!BSPLBUtils.isEmpty(paymentsResult)) {
      let logicBlockPayment = paymentsResult[0];
      orderPaymentMethod = logicBlockPayment.PaymentMethodName;
    }
    return orderPaymentMethod;
  }

  function searchDeliveryZone(order) {
    let results = [];
    const customrecord_bsp_deliveryzoneSearchObj = search.create({
      type: "customrecord_bsp_isg_deliveryzone",
      filters: [
        ["custrecord_bsp_zipcode", "is", order.ShippingAddress.PostalCode],
        "AND",
        [
          "custrecord_bsp_state_.shortname",
          "is",
          order.ShippingAddress.RegionCode,
        ],
      ],
      columns: [
        search.createColumn({
          name: "custrecord_bsp_zipcode",
          label: "Zip code",
        }),
        search.createColumn({ name: "custrecord_bsp_state_", label: "State" }),
        search.createColumn({
          name: "custrecord_bsp_routecode",
          label: "Route Code",
        }),
        search.createColumn({
          name: "custrecord_bsp_location_",
          label: "Location",
        }),
        search.createColumn({
          name: "custrecord_bsp_isg_shipdays",
          label: "Ship Days",
        }),
      ],
    });

    customrecord_bsp_deliveryzoneSearchObj.run().each(function (result) {
      let state = result.getValue({ name: "custrecord_bsp_state_" });
      let zipCode = result.getValue({ name: "custrecord_bsp_zipcode" });
      let routeCode = result.getValue({ name: "custrecord_bsp_routecode" });
      let location = result.getValue({ name: "custrecord_bsp_location_" });
      let shipDays = result.getText({ name: "custrecord_bsp_isg_shipdays" });
      results.push({ state, zipCode, routeCode, location, shipDays });
    });

    return results;
  }

  function searchShippingItem(shippingMethodId) {
    let results = [];   
    var shipitemSearchObj = search.create({
      type: "shipitem",
      filters: [["externalid", "anyof", shippingMethodId]],
      columns: [
        search.createColumn({
          name: "itemid",
          sort: search.Sort.ASC,
          label: "Name",
        }),
        search.createColumn({ name: "internalid", label: "Internal ID" }),
      ],
    });

    shipitemSearchObj.run().each(function (result) {
      let itemid = result.getValue({ name: "itemid" });
      let internalid = result.getValue({ name: "internalid" });
      results.push({ itemid, internalid });
    });

    return results;
  }


  function shipDateCalculation(delZoneResults, transactionRecord) {
    let daysArr = delZoneResults[0].shipDays.split(",");
    let sortedArr = sortWeekDayArr(daysArr);

    let shipDate = new Date(transactionRecord.getValue("shipdate"));
    let shipDateDayOfWeek = shipDate.getDay();

    // if day of shipdate is Sunday
    if(shipDateDayOfWeek==0 && daysArr[0]=='Monday'){
      shipDate.setDate(shipDate.getDate() + 1); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
      }

      if(shipDateDayOfWeek==0 && daysArr[0]=='Tuesday'){
      shipDate.setDate(shipDate.getDate() + 2); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
      }

      if(shipDateDayOfWeek==0 && daysArr[0]=='Wednesday'){
        shipDate.setDate(shipDate.getDate() + 3); 
        transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
      }
    

      if(shipDateDayOfWeek==0 && daysArr[0]=='Thursday'){
        shipDate.setDate(shipDate.getDate() + 4); 
        transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
      }
      

      if(shipDateDayOfWeek==0 && daysArr[0]=='Friday'){
        shipDate.setDate(shipDate.getDate() + 5); 
        transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
      }
      
      
      // if day of shipdate is Monday
      if(shipDateDayOfWeek==1 && daysArr[0]=='Monday')
      {
              if(daysArr[1])
            {
              // if its the same day, set the next one available from the record
              if(shipDateDayOfWeek==1 && daysArr[1]=='Tuesday'){
                shipDate.setDate(shipDate.getDate() + 1); 
                transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
              }
              

              if(shipDateDayOfWeek==1 && daysArr[1]=='Wednesday'){
              shipDate.setDate(shipDate.getDate() + 2); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
              }

              if(shipDateDayOfWeek==1 && daysArr[1]=='Thursday'){
              shipDate.setDate(shipDate.getDate() + 3); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
              }

              if(shipDateDayOfWeek==1 && daysArr[1]=='Friday'){
                shipDate.setDate(shipDate.getDate() + 4); 
                transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
              }
              
            }
            else {
              shipDate.setDate(shipDate.getDate() + 7); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) })
            };
      
      }

      if(shipDateDayOfWeek==1 && daysArr[0]=='Tuesday'){
      shipDate.setDate(shipDate.getDate() + 1); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==1 && daysArr[0]=='Wednesday'){
      shipDate.setDate(shipDate.getDate() + 2); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==1 && daysArr[0]=='Thursday'){
      shipDate.setDate(shipDate.getDate() + 3); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==1 && daysArr[0]=='Friday'){
      shipDate.setDate(shipDate.getDate() + 4); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

       // if day of shipdate is Tuesday
      if(shipDateDayOfWeek==2 && daysArr[0]=='Monday'){
        shipDate.setDate(shipDate.getDate() + 6); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate)});
      }

      if(shipDateDayOfWeek==2 && daysArr[0]=='Tuesday')
      {
        if(daysArr[1]){
              if(shipDateDayOfWeek==2 && daysArr[1]=='Wednesday'){
                shipDate.setDate(shipDate.getDate() + 1); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
              }

              if(shipDateDayOfWeek==2 && daysArr[1]=='Thursday'){
                shipDate.setDate(shipDate.getDate() + 2); 
                transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
              }
              

              if(shipDateDayOfWeek==2 && daysArr[1]=='Friday'){
                shipDate.setDate(shipDate.getDate() + 3); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
              }
        }
        else {
                shipDate.setDate(shipDate.getDate() + 7); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
             }
      }
      
      if(shipDateDayOfWeek==2 && daysArr[0]=='Wednesday'){
        shipDate.setDate(shipDate.getDate() + 1); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==2 && daysArr[0]=='Thursday'){
        shipDate.setDate(shipDate.getDate() + 2); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==2 && daysArr[0]=='Friday'){
        shipDate.setDate(shipDate.getDate() + 3); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      // if day of shipdate is Wednesday
      if(shipDateDayOfWeek==3 && daysArr[0]=='Monday'){
        shipDate.setDate(shipDate.getDate() + 5); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==3 && daysArr[0]=='Tuesday'){
        shipDate.setDate(shipDate.getDate() + 6); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }


      if(shipDateDayOfWeek==3 && daysArr[0]=='Wednesday')
      {
          if(daysArr[1]){
              if(shipDateDayOfWeek==3 && daysArr[1]=='Thursday'){
              shipDate.setDate(shipDate.getDate() + 1); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
              }

              if(shipDateDayOfWeek==3 && daysArr[1]=='Friday'){
                shipDate.setDate(shipDate.getDate() + 2); 
              transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
              }
          }
          else {
                 shipDate.setDate(shipDate.getDate() + 7); 
                transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
               }     
      }
               
      if(shipDateDayOfWeek==3 && daysArr[0]=='Thursday'){
        shipDate.setDate(shipDate.getDate() + 1); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==3 && daysArr[0]=='Friday'){
        shipDate.setDate(shipDate.getDate() + 2); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      // if day of shipdate is Thursday
      if(shipDateDayOfWeek==4 && daysArr[0]=='Monday'){
      shipDate.setDate(shipDate.getDate() + 4);   
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==4 && daysArr[0]=='Tuesday'){
      shipDate.setDate(shipDate.getDate() + 5);    
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });          
      }

      if(shipDateDayOfWeek==4 && daysArr[0]=='Wednesday'){
      shipDate.setDate(shipDate.getDate() + 6); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

      if(shipDateDayOfWeek==4 && daysArr[0]=='Thursday')
      {
        if(daysArr[1]){
            if(shipDateDayOfWeek==4 && daysArr[1]=='Friday'){
                 shipDate.setDate(shipDate.getDate() + 1); 
                  transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
                }
        }
        else {
              shipDate.setDate(shipDate.getDate() + 7); 
             transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
            }
      }

      if(shipDateDayOfWeek==4 && daysArr[0]=='Friday'){
        shipDate.setDate(shipDate.getDate() + 1); 
      transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
      }

       // if day of shipdate is Friday
       if(shipDateDayOfWeek==5 && daysArr[0]=='Monday'){
        shipDate.setDate(shipDate.getDate() + 3); 
       transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
       }

       if(shipDateDayOfWeek==5 && daysArr[0]=='Tuesday'){
        shipDate.setDate(shipDate.getDate() + 4); 
       transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
       }

       if(shipDateDayOfWeek==5 && daysArr[0]=='Wednesday'){
        shipDate.setDate(shipDate.getDate() + 5); 
       transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
       }

       if(shipDateDayOfWeek==5 && daysArr[0]=='Thursday'){
        shipDate.setDate(shipDate.getDate() + 6); 
       transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
       }

       if(shipDateDayOfWeek==5 && daysArr[0]=='Friday'){        
        shipDate.setDate(shipDate.getDate() + 7); 
        transactionRecord.setValue({fieldId:'shipdate', value: (shipDate) });
       }
      
  }

  function sortWeekDayArr(arr) {
    var reference_array = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];

    arr.sort(function (a, b) {
      return reference_array.indexOf(a) - reference_array.indexOf(b);
    });
    return arr;
  }
  function sendPOEmail(poId, AOPDvendor){
    let vendorData = BSPLBEntities.getVendorEmail(AOPDvendor);
    let vendorEmail = vendorData[0].email ? vendorData[0].email : vendorData[0].altemail ? vendorData[0].altemail : '';

    let senderId = -5;
            let recipientEmail = vendorEmail;
            let timeStamp = new Date().getUTCMilliseconds();
            let recipientId = AOPDvendor;
            let fileObj = render.transaction({
                entityId : poId,
                printMode : render.PrintMode.PDF
            });
            email.send({
                author: senderId,
                recipients: recipientEmail,
                subject: 'SO processed',
                body: 'SO has just been processed',
                attachments: [fileObj],
                relatedRecords: {
                       entityId: recipientId,
                       
                  }
            });
  }

  return {
    fetchTransaction: fetchTransaction,
    orderPaid: orderPaid,
  };
  

});
