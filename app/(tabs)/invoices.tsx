import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import { Order } from "@/types";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

const COLORS = {
  cream: "#F7EEDC",
  card: "#FFF9EE",
  brown: "#5A3825",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
};

export default function Invoices() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const invoiceRef = useRef<ViewShot>(null);

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data);
      setSelectedOrder(res.data[0] || null);
    } catch {
      Alert.alert("Error", "Cannot load invoices.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, []),
  );

  const saveInvoiceImage = async () => {
    try {
      if (!invoiceRef.current?.capture) return;

      const uri = await invoiceRef.current.capture();

      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "Invoice image saved to your photos.");
    } catch {
      Alert.alert("Error", "Failed to save invoice image.");
    }
  };

  const shareInvoiceImage = async () => {
    try {
      if (!invoiceRef.current?.capture) return;

      const uri = await invoiceRef.current.capture();

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available");
        return;
      }

      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Error", "Failed to share invoice.");
    }
  };

  const totalQty =
    selectedOrder?.items?.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    ) || 0;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Invoices</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.invoiceList}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadOrders} />
        }
      >
        {orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => setSelectedOrder(order)}
            style={[
              styles.invoiceCard,
              selectedOrder?.id === order.id && styles.invoiceCardActive,
            ]}
          >
            <Text
              style={[
                styles.invoiceNo,
                selectedOrder?.id === order.id && styles.invoiceNoActive,
              ]}
            >
              {order.invoiceNo}
            </Text>

            <Text
              style={[
                styles.invoiceAmount,
                selectedOrder?.id === order.id && styles.invoiceNoActive,
              ]}
            >
              ₱{order.total}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadOrders} />
        }
      >
        {selectedOrder ? (
          <>
            <ViewShot
              ref={invoiceRef}
              options={{
                format: "png",
                quality: 1,
              }}
            >
              <View style={styles.invoiceImage}>
                <Text style={styles.invoiceHeader}>
                  {
                    (selectedOrder.customer?.name?.toUpperCase() ||
                      selectedOrder.customerName?.toUpperCase() ||
                      "WALK-IN") +
                      " / " +
                      (selectedOrder.platform?.toUpperCase() || "MESSENGER")
                    //+
                    //"/"
                    //+
                    //formatInvoiceDate(selectedOrder.createdAt)
                  }
                </Text>

                {selectedOrder.deliveryAt && (
                  <Text style={styles.deliveryText}>
                    Delivery: {formatInvoiceDate(selectedOrder.deliveryAt)}
                  </Text>
                )}

                {(selectedOrder.customer?.address ||
                  selectedOrder.customerAddress) && (
                  <Text style={styles.addressText}>
                    Address:{" "}
                    {selectedOrder.customer?.address?.toUpperCase() ||
                      selectedOrder.customerAddress?.toUpperCase()}
                  </Text>
                )}

                <View style={styles.headerRow}>
                  <Text style={[styles.cellHeader, styles.descriptionCol]}>
                    Description
                  </Text>
                  <Text style={[styles.cellHeader, styles.qtyCol]}>Qty.</Text>
                  <Text style={[styles.cellHeader, styles.priceCol]}>
                    Price
                  </Text>
                  <Text style={[styles.cellHeader, styles.totalCol]}>
                    Total
                  </Text>
                </View>

                {selectedOrder.items.map((item: any) => (
                  <View key={item.id} style={styles.dataRow}>
                    <Text style={[styles.cellTextLeft, styles.descriptionCol]}>
                      {item.product?.name?.toUpperCase() ||
                        item.productName?.toUpperCase()}
                    </Text>

                    <Text style={[styles.cellText, styles.qtyCol]}>
                      {item.quantity}
                    </Text>

                    <Text style={[styles.cellText, styles.priceCol]}>
                      {formatMoney(item.price)}
                    </Text>

                    <Text style={[styles.cellText, styles.totalCol]}>
                      {formatMoney(item.total)}
                    </Text>
                  </View>
                ))}

                <View style={styles.finalRow}>
                  <Text style={[styles.totalTextLeft, styles.descriptionCol]}>
                    Total
                  </Text>

                  <Text style={[styles.totalText, styles.qtyCol]}>
                    {totalQty}
                  </Text>

                  <Text style={[styles.totalText, styles.priceCol]}></Text>

                  <Text style={[styles.totalText, styles.totalCol]}>
                    {formatMoney(selectedOrder.total)}
                  </Text>
                </View>
              </View>
            </ViewShot>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={saveInvoiceImage}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.actionText}>Save Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareInvoiceImage}
                style={styles.actionBtnGold}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No invoices yet.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatInvoiceDate(date: string) {
  const d = new Date(date);

  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: 18,
    paddingTop: 56,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  invoiceList: {
    marginBottom: 16,
    maxHeight: 90,
  },
  invoiceCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 18,
    marginRight: 10,
    minWidth: 130,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  invoiceCardActive: {
    backgroundColor: COLORS.brown,
  },
  invoiceNo: {
    fontWeight: "900",
    color: COLORS.brown,
  },
  invoiceNoActive: {
    color: COLORS.white,
  },
  invoiceAmount: {
    marginTop: 6,
    color: COLORS.gold,
    fontWeight: "900",
  },
  invoiceImage: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111",
    marginTop: 10,
    width: "100%",
  },
  invoiceHeader: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    padding: 10,
    borderBottomWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  deliveryText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
    padding: 8,
    borderBottomWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  addressText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 12,
    padding: 8,
    borderBottomWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#111",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#111",
    minHeight: 48,
  },
  finalRow: {
    flexDirection: "row",
  },
  descriptionCol: {
    width: "46%",
  },
  qtyCol: {
    width: "14%",
  },
  priceCol: {
    width: "20%",
  },
  totalCol: {
    width: "20%",
    borderRightWidth: 0,
  },
  cellHeader: {
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  cellTextLeft: {
    fontSize: 12,
    padding: 8,
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  cellText: {
    fontSize: 12,
    padding: 8,
    textAlign: "center",
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  totalTextLeft: {
    fontSize: 14,
    padding: 8,
    fontWeight: "900",
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  totalText: {
    fontSize: 14,
    padding: 8,
    textAlign: "center",
    fontWeight: "900",
    borderRightWidth: 2,
    borderColor: "#111",
    color: "#111",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.dark,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnGold: {
    flex: 1,
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  emptyBox: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 22,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
});
