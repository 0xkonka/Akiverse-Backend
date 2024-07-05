export function decodeMock(now: Date, issuer: string): jest.Mock {
  const nowSeconds = now.getTime() / 1000;
  return jest.fn().mockReturnValue([
    "token",
    {
      iat: nowSeconds,
      ext: nowSeconds,
      iss: issuer,
      sub: "6tFXTfRxykwMKOOjSMbdPrEMrpUl3m3j8DQycFqO2tw=",
      aud: "did:magic:f54168e9-9ce9-47f2-81c8-7cb2a96b26ba",
      nbf: nowSeconds,
      tid: "2ddf5983-983b-487d-b464-bc5e283a03c5",
      add: "0x91fbe74be6c6bfd8ddddd93011b059b9253f10785649738ba217e51e0e3df1381d20f521a3641f23eb99ccb34e3bc5d96332fdebc8efa50cdb415e45500952cd1c",
    },
  ]);
}

export function validateMock(success: boolean): jest.Mock {
  if (success) {
    return jest.fn().mockReturnValue({});
  } else {
    return jest.fn().mockImplementation(() => {
      throw new Error();
    });
  }
}

export function getIssuerMock(issuer: string): jest.Mock {
  return jest.fn().mockReturnValue(issuer);
}

export function getMetadataMock(email: string): jest.Mock {
  return jest.fn().mockResolvedValue({ email: email });
}
