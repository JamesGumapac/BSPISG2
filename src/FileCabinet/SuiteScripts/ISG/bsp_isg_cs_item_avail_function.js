/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/https", "N/url", "N/search"], /**
 * @param{https} https
 * @param{url} url
 * @param{search} search
 */ function (https, url, search) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}

  function openSuitelet(itemId, tradingPartNerId) {
    console.log("tradingPartNerId: ", tradingPartNerId)
    let tradingPartnerObjList = [];
    const tradingPartnerSearch = search.create({
      type: "customrecord_bsp_isg_trading_partner",
      filters: [],
      columns: [
        search.createColumn({ name: "internalid", label: "Internal ID" }),
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
          label: "Name",
        }),
      ],
    });
    tradingPartnerSearch.run().each(function (result) {
      tradingPartnerObjList.push({
        tradingPartnerId: result.id,
        tradingPartnerName: result.getValue("name"),
      });
      return true;
    });
    //filter out the results only for the trading partner pass in the script function
   
    tradingPartnerObjList = tradingPartnerObjList.filter(
      (f) => f.tradingPartnerId == tradingPartNerId
    );
    console.log(tradingPartnerObjList)
   const tradingPartnerName = tradingPartnerObjList[0].tradingPartnerName;
    // pass as query parameters = trading partner internal ID and itemId
    // load the trading parter and get the group and make the call
    let scriptId;
    let deploymentId;
   console.log("tradingPartnerName " + tradingPartnerObjList[0].tradingPartnerName)
    switch(tradingPartnerName) {
      case "SPR":
        scriptId = "customscript_bsp_isg_spr_display_item";
        deploymentId = "customdeploy_bsp_isg_spr_display_item";
        break;
      case "Essendant Inc":
        scriptId = "customscript_bsp_isg_esse_display_item"
        deploymentId = "customdeploy_bsp_isg_esse_display_item"
    }

    let stSuiteletUrl = url.resolveScript({
      scriptId: scriptId,
      deploymentId:deploymentId,
    });
    stSuiteletUrl += `&tradingParnerId=${tradingPartNerId}&itemId=${itemId}&tpName=${tradingPartnerName}`;
    window.open(
      stSuiteletUrl,
      "Check Item Available Stock",
      "width=1400,height=900"
    );
    
  }

  return {
    pageInit: pageInit,
    openSuitelet: openSuitelet,
  };
});
