/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search", "N/file"], /**
 * @param{record} record
 * @param{search} search
 * @param file
 */ (record, search, file) => {
  /**
   * Return file Id based on filename
   * @param fileName
   * @returns {number}
   */
  function getFileId(fileName) {
    const fileSearch = search
        .create({
          type: "file",
          filters: [["name", "is", fileName]],
        })
        .run()
        .getRange({ start: 0, end: 1 });
    return fileSearch[0].id;
  }

  /**
   * Get Vendor ID
   * @returns {*[]}
   */
  function getVendor() {
    let vendorIds = [];

    const vendorSearchObj = search.create({
      type: "customrecord_bsp_isg_rebate_contract",
      columns: [
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_BSP_ISG_RC_VENDOR",
          label: "Internal ID",
        }),
        search.createColumn({
          name: "entityid",
          join: "CUSTRECORD_BSP_ISG_RC_VENDOR",
          label: "Name",
        }),
      ],
    });
    vendorSearchObj.run().each(function (result) {
      let vendorName = result.getValue({
        name: "entityid",
        join: "CUSTRECORD_BSP_ISG_RC_VENDOR",
      });
      let vendorId = result.getValue({
        name: "internalid",
        join: "CUSTRECORD_BSP_ISG_RC_VENDOR",
      });
      vendorIds.push({
        value: vendorId,
        text: vendorName,
      });
      return true;
    });

    return vendorIds;
  }

  /**
   * Get the contract based on vendor selected
   * @param vendorId
   */
  function getContractList(vendorId) {
    let contractList = [];
    const customrecord_bsp_isg_rebate_contractSearchObj = search.create({
      type: "customrecord_bsp_isg_rebate_contract",
      filters: [["custrecord_bsp_isg_rc_vendor", "anyof", vendorId]],
      columns: [
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
          label: "Name",
        }),
      ],
    });
    customrecord_bsp_isg_rebate_contractSearchObj.run().each(function (result) {
      let contractName = result.getValue({
        name: "name",
      });
      contractList.push({
        value: result.id,
        text: contractName,
      });
      return true;
    });
    return contractList;
  }

  /**
   * Get item list
   * @param rebateContractId
   * @returns {*[]}
   */
  function getItem(rebateContractId) {
    try {
      log.debug("Get Item");
      let itemList = [];
      const customrecord_bsp_isg_item_rebates_contrtSearchObj = search.create({
        type: "customrecord_bsp_isg_item_rebates_contrt",
        filters: [
          ["custrecord_bsp_isg_irc_rebate_contract", "anyof", rebateContractId],
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            join: "CUSTRECORD_BSP_ISG_IRC_ITEM",
            label: "Internal ID",
          }),
          search.createColumn({
            name: "custrecord_bsp_isg_irc_bid_price",
            label: "Bid Price",
          }),
        ],
      });
      customrecord_bsp_isg_item_rebates_contrtSearchObj
          .run()
          .each(function (result) {
            itemList.push({
              item: result.getValue({
                name: "internalid",
                join: "CUSTRECORD_BSP_ISG_IRC_ITEM",
              }),
              bidPrice: result.getValue({
                name: "custrecord_bsp_isg_irc_bid_price",
              }),
            });
            return true;
          });
      return itemList;
    } catch (e) {
      log.debug("getItem", e.message);
    }
  }

  /**
   * Mimic Netsuite Quick Filter Settings
   * @returns {[{text: string, value: string},{text: string, value: string},{text: string, value: string},{text: string, value: string},{text: string, value: string},null,null]}
   */
  function createQuickFilter() {
    return [
      {
        value: "lastmonth",
        text: "last month",
      },
      { value: "thismonth", text: "this month" },
      { value: "threemonthsago", text: "three months ago" },
      { value: "thisfiscalyear", text: "this fiscal year" },
      { value: "lastfiscalyear", text: "last fiscal year" },
      { value: "thisfiscalquarter", text: "this fiscal quarter" },
      {
        value: "lastfiscalquarter",
        text: "last fiscal quarter",
      },
    ];
  }

  /**
   * Get all of the item under the contract selected
   * @param items
   * @param dateFilter
   * @returns {*[]}
   */
  function getTransactionLine(items, dateFilter) {
    try {
      log.debug("item", items)
      let itemLine = [];
      let item = []
      items.forEach((result) =>{
        item.push(result.item)
      })
      log.debug("item filter", item)
      const orderSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "CashSale", "CustInvc"],
          "AND",
          ["item", "anyof", item],
          "AND",
          ["trandate", "within", dateFilter],
        ],
        columns: [
          search.createColumn({ name: "item", label: "Item" }),
          search.createColumn({
            name: "manufacturer",
            join: "item",
            label: "Manufacturer",
          }),
          search.createColumn({
            name: "salesdescription",
            join: "item",
            label: "Description",
          }),
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({ name: "trandate", label: "Date" }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({ name: "rate", label: "Item Rate" }),
          search.createColumn({ name: "quantity", label: "Quantity" }),
        ],
      });

      let column = orderSearchObj.columns;
      orderSearchObj.run().each(function (result) {
        let productId = result.getValue(column[0])
        let index = items.findIndex(x => x.item == productId)
        let bidPrice
        if(index !== -1){
          bidPrice = items[index].bidPrice
        }
        itemLine.push({
          Document_Number: result.getValue(column[3]),
          End_User: result.getText(column[5]),
          Product: result.getText(column[0]),
          Quantity: result.getValue(column[7]),
          Invoice_Price: result.getValue(column[6]),
          Bid_Price: bidPrice,
          Manufacturer: result.getValue(column[1]),
          // Description: result.getValue(column[2]),
          Date: result.getValue(column[4]),
        });
        return true;
      });
      log.debug("itemLine", itemLine);
      return itemLine;
    } catch (e) {
      log.debug("getTransactionLine", e.message);
    }
  }

  /**
   * return date and item
   * @returns {string}
   */
  function getDateNow() {
    let dateHolder = new Date();
    return (
        [
          dateHolder.getMonth() + 1,
          dateHolder.getDate(),
          dateHolder.getFullYear(),
        ].join("_") +
        "_" +
        [dateHolder.getHours(), dateHolder.getMinutes()].join("_")
    );
  }

  /**
   * Export results into CSV file format
   * @param result
   * @returns {File}
   */
  function createCSVFile(result) {
    let mainCSVtoRender = "";
    mainCSVtoRender += Object.keys(result[0]);
    mainCSVtoRender = mainCSVtoRender.replace(/_/g, " ");
    mainCSVtoRender += "\r\n";
    result.forEach((value) => {
      let values = Object.values(value);
      values.forEach((val) => {
        mainCSVtoRender += val.replace(/,/g, " ");
        mainCSVtoRender += ",";
      });
      mainCSVtoRender += "\r\n";
    });
    return file.create({
      name: "Item Rebate.csv " + getDateNow() + ".csv",
      fileType: file.Type.CSV,
      contents: mainCSVtoRender,
    });
  }

  function isEmpty(stValue) {
    return (
        stValue === "" ||
        stValue == null ||
        false ||
        (stValue.constructor === Array && stValue.length == 0) ||
        (stValue.constructor === Object &&
            (function (v) {
              for (var k in v) return false;
              return true;
            })(stValue))
    );
  }

  return {
    getVendor: getVendor,
    getTransactionLine: getTransactionLine,
    getFileId: getFileId,
    getContractList: getContractList,
    getItem: getItem,
    createQuickFilter: createQuickFilter,
    isEmpty: isEmpty,
    createCSVFile: createCSVFile,
  };
});
