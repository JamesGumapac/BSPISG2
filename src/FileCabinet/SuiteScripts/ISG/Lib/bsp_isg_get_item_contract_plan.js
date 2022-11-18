/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  /**
   * Get trading parnter Id
   * @param vendor
   * @returns {null}
   */
  function getTradingPartnerID(vendor) {
    let tradingPartnerID = null;
    const trading_partnerSearchObj = search.create({
      type: "customrecord_bsp_isg_trading_partner",
      filters: [
        ["custrecord_bsp_isg_tp_vendor", "anyof", vendor],
        "AND",
        ["isinactive", "is", "F"],
      ],
      columns: [],
    });

    trading_partnerSearchObj.run().each(function (result) {
      tradingPartnerID = result.id;
      return true;
    });

    return tradingPartnerID;
  }
  /**
   * check if the vendor is a trading parnter
   * @type {Search}
   */
  function isTradingPartner(vendor) {
    const trading_partnerSearchObj = search.create({
      type: "customrecord_bsp_isg_trading_partner",
      filters: [
        ["custrecord_bsp_isg_tp_vendor", "anyof", vendor],
        "AND",
        ["isinactive", "is", "F"],
      ],
      columns: [],
    });
    const searchResultCount = trading_partnerSearchObj.runPaged().count;
    return searchResultCount > 0;
  }
  
  /**
   * Get the account number that is carton buy
   * @param tpId
   * @returns {*}
   */
  function getTpAccountCartonBuy(tpId) {
    let accountNumber;
    const customrecord_bsp_isg_account_numberSearchObj = search.create({
      type: "customrecord_bsp_isg_account_number",
      filters: [
        ["custrecord_bsp_isg_carton_buy_acct", "is", "T"],
        "AND",
        ["custrecord_bsp_isg_parent_trading_partn", "anyof", tpId],
      ],
    });

    customrecord_bsp_isg_account_numberSearchObj.run().each(function (result) {
      accountNumber = result.id;
    });
    return accountNumber;
  }
  
  /**
   * Look for the cost of the item in the contract
   * @param item
   * @param accountNumber
   * @returns {*}
   */
  function lookForContractCost(item, accountNumber) {
    let cost;
    const customrecord_bsp_isg_item_acct_dataSearchObj = search.create({
      type: "customrecord_bsp_isg_item_acct_data",
      filters: [
        ["custrecord_bsp_isg_parent_item", "anyof", item],
        "AND",
        ["custrecord_bsp_isg_account_number", "anyof", accountNumber],
      ],
      columns: [
        search.createColumn({
          name: "custrecord_bsp_isg_item_cost",
          label: "Cost",
        }),
      ],
    });
    customrecord_bsp_isg_item_acct_dataSearchObj.run().each(function (result) {
      cost = result.getValue({
        name: "custrecord_bsp_isg_item_cost",
      });
      return true;
    });
    return cost;
  }
  
  /**
   * check if the string is empty
   * @param stValue
   * @returns {boolean}
   */
  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length === 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  return {
    getTradingPartnerID: getTradingPartnerID,
    isTradingPartner: isTradingPartner,
    getTpAccountCartonBuy: getTpAccountCartonBuy,
    isEmpty: isEmpty,
    lookForContractCost: lookForContractCost,
  };
});
