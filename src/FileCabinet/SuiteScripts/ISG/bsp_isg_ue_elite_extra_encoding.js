/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/encode"], /**
 * @param{encode} encode
 */
(encode) => {
  const beforeSubmit = (scriptContext) => {
    let rec = scriptContext.newRecord;
    let userName = rec.getValue("custrecord_bsp_isg_username");
    let password = rec.getValue("custrecord_bsp_isg_password");
    let string = userName + ":" + password;
    let BASED64Encoding = encode.convert({
      string: string,
      inputEncoding: encode.Encoding.UTF_8,
      outputEncoding: encode.Encoding.BASE_64,
    });
    let encoding = rec.getValue("custrecord_bsp_isg_based64encoding");
    if (encoding !== BASED64Encoding) {
      rec.setValue({
        fieldId: "custrecord_bsp_isg_based64encoding",
        value: BASED64Encoding,
      });
    }
    log.debug("BASED64Encoding", BASED64Encoding);
  };

  return { beforeSubmit };
});
