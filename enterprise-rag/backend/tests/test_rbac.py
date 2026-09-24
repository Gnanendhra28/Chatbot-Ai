from app.core.security import UserPrincipal


def test_user_principal_roles():
    admin = UserPrincipal(role="admin", department="HR")
    manager = UserPrincipal(role="manager", department="Engineering")
    employee = UserPrincipal(role="employee", department="Engineering")

    assert admin.role == "admin"
    assert manager.role == "manager"
    assert manager.department == "Engineering"
    assert employee.role == "employee"
    assert employee.department == "Engineering"
