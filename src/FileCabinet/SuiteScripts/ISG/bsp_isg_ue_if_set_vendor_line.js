/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  const afterSubmit = (context) => {
    const functionName = "afterSubmit";

    try {
      const recId = context.newRecord.id;
      const ifRec = record.load({
        type: record.Type.ITEM_FULFILLMENT,
        id: recId,
      });
      const soId = ifRec.getValue("createdfrom");
      const soRec = record.load({
        type: record.Type.SALES_ORDER,
        id: soId,
        isDynamic: true,
      });

      for (let i = 0; i < ifRec.getLineCount({ sublistId: "item" }); i++) {
        const orderline = ifRec.getSublistValue({
          sublistId: "item",
          fieldId: "orderline",
          line: i,
        });
        const poId = ifRec.getSublistValue({
          sublistId: "item",
          fieldId: "createdpo",
          line: i,
        });
        if (poId) {
          ifRec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_bsp_isg_po_vendor",
            line: i,
            value: vendorSearch(poId),
          });
        } else {
          // if no poId is provided in if line item check the SO line
          const poVendor = checkPOfromSO(soRec, orderline - 1);
          if (poVendor) {
            ifRec.setSublistValue({
              sublistId: "item",
              fieldId: "custcol_bsp_isg_po_vendor",
              line: i,
              value: poVendor,
            });
          }
        }
      }
      ifRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  /**
   * Look for the vendor ID
   * @param poId
   * @returns {*}
   */
  function vendorSearch(poId) {
    let vendor;
    const purchaseorderSearchObj = search.create({
      type: "purchaseorder",
      filters: [
        ["type", "anyof", "PurchOrd"],
        "AND",
        ["internalid", "is", poId],
        "AND",
        ["mainline", "is", "T"],
      ],
      columns: [search.createColumn({ name: "entity", label: "Name" })],
    });
    purchaseorderSearchObj.run().each(function (result) {
      vendor = result.getValue({
        name: "entity",
      });
      return true;
    });
    return vendor;
  }

  /**
   * Check if the corresponding line in the SO is a special order
   * @param soRec
   * @param line
   * @returns {*}
   */
  function checkPOfromSO(soRec, line) {
    let poVendor;
    poVendor = soRec.getSublistValue({
      sublistId: "item",
      fieldId: "povendor",
      line: line,
    });

    if (!poVendor) {
      //if no po vendor set check if there's a po record set in so line
      const isSpecialOrder = soRec.getSublistValue({
        sublistId: "item",
        fieldId: "isspecialorderline",
        line: line,
      });
      log.debug("isSpecialOrder: ", { line, isSpecialOrder });
      if (isSpecialOrder === "T") {
        const createdPO = soRec.getCurrentSublistValue({
          sublistId: "item",
          fieldId: "createdpo",
        });
        if (createdPO) {
          poVendor = vendorSearch(createdPO);
        }
      }
    }

    return poVendor;
  }

  return { afterSubmit };
});
