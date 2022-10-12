/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/search",
  "N/ui/dialog",
  "N/ui/message",
  "./Lib/bsp_isg_elite_extra_create_order.js",
], function (search, dialog, message, BSPExliteExtra) {
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

  function validateTrackingInformation(ifId, eliteExtraId) {
    //check if tracking number is existing to prompt user for confirmation to re-upload order details if existing
    const trackingNumberSearch = search.lookupFields({
      type: "itemfulfillment",
      id: ifId,
      columns: ["custbody_bsp_tracking_number"],
    });

    if (
      !BSPExliteExtra.isEmpty(trackingNumberSearch.custbody_bsp_tracking_number)
    ) {
      let options = {
        title: "Order already exists. Do you want to re-upload it?",
        message: "Press OK or Cancel",
      };

      function success(result) {
        if (result === true) {
          alert("Uploading Order Please wait...");
          const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
          BSPExliteExtra.showResponseToUser(response);
        }
      }

      dialog.confirm(options).then(success);
    } else {
      alert("Uploading Order Please wait...");
      const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
      BSPExliteExtra.showResponseToUser(response);
    }
  }


  return {
    pageInit: pageInit,
    validateTrackingInformation: validateTrackingInformation,
  };
});
