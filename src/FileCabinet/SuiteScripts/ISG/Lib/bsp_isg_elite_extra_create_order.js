/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/record",
  "N/runtime",
  "N/search",
  "N/http",
  "N/format",
  "N/https",
  "N/ui/message",
], /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{http} http
 */ function (record, runtime, search, http, format, https, message) {
  // get the object from ITEM_FULFILLMENT and SALES_ORDER
  function getIfDetails(ifRecId) {
    try {
      const ifRec = record.load({
        type: record.Type.ITEM_FULFILLMENT,
        id: ifRecId,
        isDynamic: true
      });
      const soId = ifRec.getValue("createdfrom");
      const soRec = record.load({
        type: record.Type.SALES_ORDER,
        id: soId,
        isDynamic: true
      });
      let tranAmount = 0;
      const salesRepId = soRec.getValue("salesrep");
      let salesRepInfo = "";
      if (!isEmpty(salesRepId)) {
        salesRepInfo = search.lookupFields({
          type: search.Type.EMPLOYEE,
          id: salesRepId,
          columns: ["firstname", "lastname"]
        });
      }

      const billSubRecord = soRec.getSubrecord({
        fieldId: "billingaddress"
      });

      const shipSubRecord = soRec.getSubrecord({
        fieldId: "shippingaddress"
      });

      const orderHeaderFields = [];
      orderHeaderFields.push({
        orderId: ifRec.getValue("tranid"),
        warehouse: 1,//soRec.getValue("location"),
        po: soRec.getValue("otherrefnum") || "",
        status: "",
        price: tranAmount || 0,
        tax: soRec.getValue("tax") || 0,
        deposit: soRec.getValue("custbody_bsp_aab_so_deposit") || 0,
        dateTime: formatDateTime(soRec.getValue("trandate")) || "",
        shipTime: formatDateTime(ifRec.getValue("trandate")) || "",
        comment: soRec.getValue("memo") || "",
        shipViaName: soRec.getText("shipmethod"),
        salesPersonId: soRec.getValue("salesrep"),
        salesPersonName: isEmpty(salesRepInfo) ? "" : salesRepInfo.firstname,
        salesPersonLastname: isEmpty(salesRepInfo) ? "" : salesRepInfo.lastname,
        billToId: soRec.getValue("entity") || "",
        billToName: billSubRecord.getValue("addressee") || "",
        billToPhone: billSubRecord.getValue("phone") || "",
        billAddressLine1: billSubRecord.getValue("addr1") || "",
        billAddressLine2: billSubRecord.getValue("addr2") || "",
        billAddressLine3: billSubRecord.getValue("addr3") || "",
        billCity: billSubRecord.getValue("city") || "",
        billState: billSubRecord.getValue("state") || "",
        billZip: billSubRecord.getValue("zip") || "",
        shipToId: soRec.getValue("entity") || "",
        shipToName: shipSubRecord.getValue("addressee") || "",
        shipToPhone: shipSubRecord.getValue("phone") || "",
        shipAddressLine1: shipSubRecord.getValue("addr1") || "",
        shipAddressLine2: shipSubRecord.getValue("addr2") || "",
        shipAddressLine3: shipSubRecord.getValue("addr3") || "",
        shipCity: shipSubRecord.getValue("city") || "",
        shipState: shipSubRecord.getValue("state") || "",
        shipZip: shipSubRecord.getValue("zip") || ""
      });

      const itemLineInfo = [];
      for (let i = 0; i < ifRec.getLineCount("item"); i++) {
        const itemReceive = ifRec.getSublistValue({
          sublistId: "item",
          fieldId: "itemreceive",
          line: i,
        });
        if (itemReceive == "T" || itemReceive == true) {

          const itemId = ifRec.getSublistValue({
            sublistId: "item",
            fieldId: "itemname",
            line: i
          });

          const rate = soRec.getSublistValue({
            sublistId: "item",
            fieldId: "rate",
            line: i
          });
          const order_quantity = ifRec.getSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i
          });
            let lineAmount = 0
            lineAmount = parseFloat(rate) * parseFloat(order_quantity)
            tranAmount += +lineAmount
          itemLineInfo.push({
            order_quantity: order_quantity,
            number: itemId,
            rate: rate,
            amount: lineAmount ,
            description: ifRec.getSublistValue({
              sublistId: "item",
              fieldId: "description",
              line: i,
            }),
            location: ifRec.getSublistValue({
              sublistId: "item",
              fieldId: "location",
              line: i,
            })
          });
        }
      }
      log.debug("orderHeaderFields", { orderHeaderFields, itemLineInfo });
      return { orderHeaderFields, itemLineInfo };
    } catch (e) {
      log.error(e.message);
    }
  }

  function uploadOrderAPI(endpointURL, headers, orderXML, ifId) {
    let message = [];
    const URL = endpointURL + "/upload_order";
    const res = https.post({
      url: URL,
      headers: headers,
      body: orderXML,
    });
    const response = res.body;
    const resString = [response];
    const resBody = JSON.parse(resString[0]);

    if (res.code === 200 && !isEmpty(resBody.tracking)) {
      const ifUpdateId = record.submitFields({
        type: record.Type.ITEM_FULFILLMENT,
        id: ifId,
        values: {
          custbody_bsp_tracking_number: resBody.tracking,
          custbody_bsp_filename: resBody.filename,
        },
      });
      log.debug("IF ID: " + ifUpdateId + " Updated", [
        resBody.tracking,
        resBody.filename,
      ]);
      message.push({
        message: "Order has been created successfully",
        failed: false,
      });
    } else {
      message.push({
        message: "Failed to create order",
        failed: true,
      });
    }
    log.debug("message", message);
    log.debug("response", response);
    return message;
  }

  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      stValue == undefined ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  function getSoInvoice(soId) {
    try {
      let invoiceId = "";
      const fil1 = search.createFilter({
        name: "createdfrom",
        operator: search.Operator.IS,
        values: soId,
      });

      const fil2 = search.createFilter({
        name: "mainline",
        operator: search.Operator.IS,
        values: true,
      });

      const internalId = search.createColumn({
        name: "internalid",
      });

      const type = search.createColumn({
        name: "type",
      });

      const invoiceSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [fil1, fil2],
        columns: [internalId, type],
      });
      invoiceSearch.run().each(function (result) {
        invoiceId = result.id;
        return true;
      });

      return invoiceId;
    } catch (e) {
      log.error(e.message);
    }
  }

  function formatDateTime(date) {
    const dateTime = format.format({
      value: new Date(date),
      type: format.Type.DATETIMETZ,
      timezone: format.Timezone.AMERICA_NEW_YORK,
    });
    let dateobj = new Date(dateTime);
    let d = dateobj.toISOString();
    return d;
  }

  return {
    getIfDetails: getIfDetails,
    uploadOrderAPI: uploadOrderAPI,
    isEmpty: isEmpty,
  };
});
