import https from "node:https";

https
  .get("https://www.googletagmanager.com/gtm.js?id=GTM-PD6J398", (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      console.log(
        JSON.stringify(
          {
            has_choice: d.includes('"vtp_name":"choice"'),
            has_9VjS: d.includes("9VjSCLSUx9ocENOW2IQD"),
            has_KL9b: d.includes("KL9bCO__i6QcENOW2IQD"),
            has_hostname: d.includes("comparaseguroonline.com.br"),
          },
          null,
          2,
        ),
      );
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
