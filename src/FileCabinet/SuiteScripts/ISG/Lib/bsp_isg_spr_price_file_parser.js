/**
 * @NApiVersion 2.1
 */
define(["N/file"], /**
 * @param{file} file
 */ (file) => {
  function getItem(itemlist) {
    try {
      let objKeys = [
        "rectyp",
        "stckno",
        "prcname",
        "prccode",
        "future1",
        "startdt",
        "enddt",
        "fcpgno",
        "cstq1",
        "cstp1",
        "cstp3",
        "cstp4",
        "vndrop",
        "leadtime",
        "autoord",
        "autoord",
        "prjctnum",
        "future2",
        "pcstq1",
        "pcstc1",
        "pcstq2",
        "pcstc2",
        "pcstq3",
        "pcstc3",
        "future3",
        "saleq1",
        "salep1",
        "saleq2",
        "salep1",
        "saleq3",
        "salep3",
        "shiplt",
        "catlist2",
        "catuom2",
        "prcid",
        "firm",
        "net",
      ];
      let objValue = [];
      let itemInfo = itemlist.replace(/['\t']/g, ",");
      itemInfo = itemInfo.split(",");
      itemInfo.forEach(function (itemInfo) {
        objValue.push(itemInfo);
      });

      log.debug("getItem", createItemObj(objKeys, objValue));
      return createItemObj(objKeys, objValue)
    } catch (e) {
      log.error("getItem", e.message);
    }
  }

  function createItemObj(key, value) {
    return key.reduce((acc, val, ind) => {
      acc[val] = value[ind];
      return acc;
    }, {});
  }
  return {
    getItem: getItem,
  };
});
