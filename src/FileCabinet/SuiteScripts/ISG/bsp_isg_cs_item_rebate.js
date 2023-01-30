/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/record", "N/search", "N/url"], /**
 * @param{record} record
 * @param{search} search
 * @param url
 */
function (record, search, url) {
  let suitelet = null;

  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {
    suitelet = scriptContext.currentRecord;
    let arrTemp = window.location.href.split('?');
    let urlParams = new URLSearchParams(arrTemp[1]);
    suitelet.setValue({
      fieldId: "custpage_date_filter",
      value: urlParams.get('custparam_dateFilter'),
      ignoreFieldChange: true
    })
  }

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) {
    try {
      if (
          scriptContext.fieldId == "custpage_vendor" ||
          scriptContext.fieldId == "custpage_rebate_contract" ||  scriptContext.fieldId == "custpage_date_filter"
      ) {
        let vendorId = suitelet.getValue({
          fieldId: "custpage_vendor",
        });
        let contractRebate = suitelet.getValue({
          fieldId: "custpage_rebate_contract",
        });
        let dateFilter = suitelet.getValue({
          fieldId: "custpage_date_filter",
        });

        let parameters = {
          custparam_vendorSelected: vendorId,
          custparam_rebateContract: contractRebate,
          custparam_dateFilter: dateFilter
        };
        if (isEmpty(vendorId)) {
          parameters = {};
        }

        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_bsp_isg_sl_get_rebate_items",
          deploymentId: "customdeploy_bsp_isg_sl_get_rebate_items",
          returnExternalUrl: false,
          params: parameters,
        });
        window.ischanged = false;
        window.open(stSuiteletUrl, "_self");
      }
    } catch (e) {
      console.log(e.message);
    }
  }

  function isEmpty(value) {
    let stLogTitle = "isEmpty";
    try {
      if (value == null || value == "" || !value || value == "undefined") {
        return true;
      }
      return false;
    } catch (error) {
      console.log(stLogTitle, error);
    }
  }



  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
  };
});
