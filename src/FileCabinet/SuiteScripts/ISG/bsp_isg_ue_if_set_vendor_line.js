/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (scriptContext) => {};

  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeSubmit = (context) => {};

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
    log.debug("vendor", vendor);
    return vendor;
  }

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (context) => {
    const functionName = "afterSubmit";

    try {
      const recId = context.newRecord.id;
      const ifRec = record.load({
        type: record.Type.ITEM_FULFILLMENT,
        id: recId,
      });
      for (let i = 0; i < ifRec.getLineCount({ sublistId: "item" }); i++) {
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
        }
      }
      ifRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
