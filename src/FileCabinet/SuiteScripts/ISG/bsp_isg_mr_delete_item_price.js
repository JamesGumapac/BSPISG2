/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/runtime",
  "N/search",
  "N/file",
  "N/record",
  "./Lib/bsp_isg_update_pricing.js",
], /**
 * @param{runtime} runtime
 * @param{search} search
 * @param{file} file
 * @param{record} record
 * @param{*} BSPUpdatePricing
 */ (runtime, search, file, record, BSPUpdatePricing) => {
  /**
   * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
   * @param {Object} inputContext
   * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Object} inputContext.ObjectRef - Object that references the input data
   * @typedef {Object} ObjectRef
   * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
   * @property {string} ObjectRef.type - Type of the record instance that contains the input data
   * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
   * @since 2015.2
   */
  let tpAccountNumber;
  const getInputData = (inputContext) => {
    try {
      let functionName = "getInputData";
      log.audit(functionName, "************ EXECUTION STARTED ************");
      let folderId;
      const scriptObj = runtime.getCurrentScript();
      const vendor = scriptObj.getParameter({
        name: "custscript_bsp_isg_vendor_trdng_prtnr",
      });
      const isEssendant = scriptObj.getParameter({
        name: "custscript_bsp_isg_is_essendant",
      });
      if (isEssendant) {
        folderId = scriptObj.getParameter({
          name: "custscript_bsp_isg_esse_pen_fol_id",
        });
      }
      const fileObj = file.load({
        id: BSPUpdatePricing.getFileId(folderId),
      });
      const tradingPartnerId = scriptObj.getParameter({
        name: "custscript_bsp_isg_tp",
      });
      const accountNumber = fileObj.name.replace(".csv", "");
      tpAccountNumber = BSPUpdatePricing.checkIfTPAccountNumberExists(
        tradingPartnerId,
        accountNumber
      );
      if (!tpAccountNumber)
        throw "Cannot Process the file. Account Number does not exist";
      return BSPUpdatePricing.searchItemAccountNumberPlan(
        tpAccountNumber,
        vendor
      );
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  /**
   * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
   * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
   * context.
   * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
   *     is provided automatically based on the results of the getInputData stage.
   * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
   *     function on the current key-value pair
   * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
   *     pair
   * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {string} mapContext.key - Key to be processed during the map stage
   * @param {string} mapContext.value - Value to be processed during the map stage
   * @since 2015.2
   */

  const reduce = (reduceContext) => {
    let functionName = "reduceContext";
    try {
      let itemAccountPlanId = JSON.parse(reduceContext.values);
      record.delete({
        type: "customrecord_bsp_isg_item_acct_data",
        id: itemAccountPlanId,
      });
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  /**
   * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
   * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
   * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
   * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
   *     script
   * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
   * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
   * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
   * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
   *     script
   * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
   * @param {Object} summaryContext.inputSummary - Statistics about the input stage
   * @param {Object} summaryContext.mapSummary - Statistics about the map stage
   * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
   * @since 2015.2
   */
  const summarize = (summaryContext) => {
    log.debug("TpAccountNumber", tpAccountNumber)
    const functionName = "Summarize";
    const ESSENDANT_UPDATE_PRICING_DEPLOYMENT_ID =
      "customdeploy_bsp_isg_esse_updt_prcng";
    const ESSENDANT_UPDATE_PRICING_SCRIPT_ID =
      "customscript_bsp_mr_update_item_pricing";

    const scriptObj = runtime.getCurrentScript();
    const isEssendant = scriptObj.getParameter({
      name: "custscript_bsp_isg_is_essendant",
    });
    if (isEssendant) {
      BSPUpdatePricing.createItemAndItemAccountPlan(
        ESSENDANT_UPDATE_PRICING_SCRIPT_ID,
        ESSENDANT_UPDATE_PRICING_DEPLOYMENT_ID
      );
    }

    log.audit(functionName, {
      UsageConsumed: summaryContext.usage,
      NumberOfQueues: summaryContext.concurrency,
      NumberOfYields: summaryContext.yields,
    });
    log.debug(functionName, "************ EXECUTION COMPLETED ************");
  };

  return { getInputData, reduce, summarize };
});
