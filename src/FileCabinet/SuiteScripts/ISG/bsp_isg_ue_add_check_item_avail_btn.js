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

  const beforeLoad = (context) => {
    let stLogTitle = "beforeLoad";

    try {
      let clientScriptFileId = search
        .create({
          type: "file",
          filters: [["name", "is", "bsp_isg_cs_item_avail_function.js"]],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      context.form.clientScriptFileId = clientScriptFileId[0].id;
      const itemRec = context.newRecord;
      const itemId = itemRec.id;

      const activeTradingPartnerList = [];
      //search trading parter record that are active and have a value in the availability section{groupCode, user, password, endpointURL}
      let activeTradingPartnerSearch = search.create({
        type: "customrecord_bsp_isg_trading_partner",
        filters:  [
          ["isinactive","is","F"],
          "AND",
          ["custrecord_bsp_isg_tp_user","isnotempty",""],
          "AND",
          ["custrecord_bsp_isg_tb_password","isnotempty",""]
        ],
        columns: [
          search.createColumn({ name: "internalid", label: "Internal ID" }),
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name",
          }),
        ],
      });
      const activeTradingPartnerSearchResultCount =
        activeTradingPartnerSearch.runPaged().count;
      if (activeTradingPartnerSearchResultCount > 0) {
        activeTradingPartnerSearch.run().each(function (result) {
          activeTradingPartnerList.push({
            tradingPartnerId: result.id,
            tradingPartnerName: result.getValue("name"),
          });
          return true;
        });
      }
     
      if (context.type === "view") {
        activeTradingPartnerList.forEach(function (partner) {
          log.debug("activeTradingPartner Name", partner.tradingPartnerName)
          log.debug("activeTradingPartner ID", partner.tradingPartnerId)
          context.form.addButton({
            id:
              "custpage_check_item_availability" +
              `_${partner.tradingPartnerName}`,
            label: partner.tradingPartnerName + " Check Item Availability",
            functionName: `openSuitelet(${itemId},${partner.tradingPartnerId})`,
          });
        });
      }
    } catch (e) {
      log.error(stLogTitle, JSON.stringify(e));
    }
  };

  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeSubmit = (scriptContext) => {};

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {};

  return { beforeLoad };
});
