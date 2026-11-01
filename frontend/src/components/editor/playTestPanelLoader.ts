// Nơi duy nhất tải màn chơi thử (kéo theo renderer Canvas). Tách riêng để test thay được lần tải (mô phỏng mạng chập chờn làm
// tải gói mã thất bại rồi thành công ở lần thử lại).
export const playTestPanelLoader = {
  load: () => import('./PlayTestPanel'),
}
