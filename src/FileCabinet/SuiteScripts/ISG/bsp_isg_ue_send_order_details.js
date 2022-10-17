/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/search", "N/record", "N/runtime"], /**

 * @param{record} record
 * @param{record} search
 * @param{xml} xml
 */ (search, record, runtime) => {

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeLoad = (context) => {

    try {
      let clientScriptFileId = search
        .create({
          type: "file",
          filters: [["name", "is", "bsp_isg_cs_elite_extra_upload_order.js"]],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      context.form.clientScriptFileId = clientScriptFileId[0].id;

      if (context.type == "view") {
        const scriptObj = runtime.getCurrentScript();
        const eliteExtraSettings = scriptObj.getParameter({
          name: "custscript_bsp_isg_elite_extra_settings",
        });
        const ifId = context.newRecord.id;


        context.form.addButton({
          id: "custpage_send_order_details",
          label: "Upload Order",
          functionName: `validateTrackingInformation(${ifId},${eliteExtraSettings})`,
        });
      }
    } catch (e) {
      log.error(e.message);
    }
  };

  return { beforeLoad };
});
