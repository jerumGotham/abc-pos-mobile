import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";

const COLORS = {
  cream: "#F7EEDC",
  brown: "#5A3825",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
  card: "#FFF9EF",
};

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/customers");
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.log("CUSTOMERS ERROR:", err?.response?.data || err.message);
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomer = (customer: any) => {
    setSelected({ ...customer });
    setModalVisible(true);
  };

  const updateCustomer = async () => {
    if (!selected?.id) return;

    try {
      await api.patch(`/customers/${selected.id}`, {
        name: selected.name,
        contact: selected.contact,
        address: selected.address,
        platform: selected.platform,
      });

      setModalVisible(false);
      fetchCustomers();
    } catch (err: any) {
      console.log("UPDATE CUSTOMER ERROR:", err?.response?.data || err.message);
      Alert.alert("Error", "Failed to update customer.");
    }
  };

  const deleteCustomer = (id: string) => {
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to delete this customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/customers/${id}`);
              setModalVisible(false);
              fetchCustomers();
            } catch (err: any) {
              console.log(
                "DELETE CUSTOMER ERROR:",
                err?.response?.data || err.message,
              );
              Alert.alert("Error", "Failed to delete customer.");
            }
          },
        },
      ],
    );
  };

  const renderCustomer = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => openCustomer(item)}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name || "No name"}</Text>
          <Text style={styles.subText}>{item.contact || "No contact"}</Text>
          <Text style={styles.subText}>{item.address || "No address"}</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color={COLORS.gold} />
      </View>

      <View style={styles.historyBox}>
        <Text style={styles.historyTitle}>Recent Orders</Text>

        {item.orders?.length > 0 ? (
          item.orders.slice(0, 3).map((order: any) => (
            <Text key={order.id} style={styles.orderText}>
              • {order.invoiceNo} — ₱{formatMoney(order.total)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>No orders yet.</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Customers</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchCustomers} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No customers found.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Customer Details</Text>

              <TextInput
                value={selected?.name || ""}
                onChangeText={(text) =>
                  setSelected((prev: any) => ({ ...prev, name: text }))
                }
                placeholder="Customer name"
                style={styles.input}
              />

              <TextInput
                value={selected?.contact || ""}
                onChangeText={(text) =>
                  setSelected((prev: any) => ({ ...prev, contact: text }))
                }
                placeholder="Contact"
                style={styles.input}
              />

              <TextInput
                value={selected?.address || ""}
                onChangeText={(text) =>
                  setSelected((prev: any) => ({ ...prev, address: text }))
                }
                placeholder="Address"
                style={styles.input}
              />

              <TextInput
                value={selected?.platform || ""}
                onChangeText={(text) =>
                  setSelected((prev: any) => ({ ...prev, platform: text }))
                }
                placeholder="Platform"
                style={styles.input}
              />

              <Text style={styles.sectionTitle}>Order History</Text>

              {selected?.orders?.length > 0 ? (
                selected.orders.map((order: any) => (
                  <View key={order.id} style={styles.orderCard}>
                    <Text style={styles.orderInvoice}>{order.invoiceNo}</Text>
                    <Text style={styles.orderText}>
                      Total: ₱{formatMoney(order.total)}
                    </Text>
                    <Text style={styles.orderText}>
                      Status: {order.orderStatus}
                    </Text>

                    {order.items?.map((item: any) => (
                      <Text key={item.id} style={styles.itemText}>
                        • {item.product?.name} {item.variant?.label} x
                        {item.quantity}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No order history.</Text>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={updateCustomer}>
                <Text style={styles.btnText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteCustomer(selected.id)}
              >
                <Text style={styles.btnText}>Delete Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-PH");
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.dark,
  },
  subText: {
    color: "#7A6A5A",
    fontWeight: "700",
    marginTop: 3,
  },
  historyBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ECDDC3",
  },
  historyTitle: {
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 4,
  },
  orderText: {
    color: COLORS.dark,
    fontWeight: "700",
    marginTop: 3,
  },
  emptyText: {
    color: "#8A7B6A",
    fontWeight: "700",
  },
  error: {
    color: "red",
    fontWeight: "800",
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    padding: 18,
  },
  modalBox: {
    backgroundColor: COLORS.cream,
    borderRadius: 24,
    padding: 18,
    maxHeight: "88%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.brown,
    marginTop: 12,
    marginBottom: 10,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  orderInvoice: {
    fontWeight: "900",
    color: COLORS.gold,
    marginBottom: 4,
  },
  itemText: {
    color: "#6F5F50",
    fontWeight: "700",
    marginTop: 3,
  },
  saveBtn: {
    backgroundColor: COLORS.gold,
    padding: 15,
    borderRadius: 16,
    marginTop: 14,
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#B3261E",
    padding: 15,
    borderRadius: 16,
    marginTop: 10,
    alignItems: "center",
  },
  cancelBtn: {
    padding: 15,
    alignItems: "center",
  },
  btnText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  cancelText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
});
